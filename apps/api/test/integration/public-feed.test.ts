import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/infra/prisma';
import { app, createAgency, createUser, loginAs, openTicket, resetDatabase, truncateTickets } from './helpers';

/**
 * "Na cidade" — `GET /api/v1/tickets/public` (lista) e
 * `GET /api/v1/tickets/public/:id` (detalhe).
 *
 * São as ÚNICAS rotas do app do cidadão que devolvem chamado de outra pessoa, e
 * isso é intencional: servem para não abrir chamado duplicado e para ver que a
 * prefeitura executa. Não é um afrouxamento do isolamento por `userId` — é um
 * caminho adicional, com a MESMA regra de visibilidade para lista e detalhe
 * (`publicScope`), que nunca carrega quem abriu.
 *
 * Os testes de conjunto exato de chaves são os mais importantes do arquivo: a
 * lista tem a sua lista de permissão, e o detalhe tem de ser idêntico, chave a
 * chave, ao que o próprio autor recebe. Um `user` incluído por descuido quebra
 * aqui em vez de expor nome e e-mail.
 */
describe('lista pública de chamados', () => {
  let joaoToken: string;
  let anaToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await resetDatabase();
    await createUser('citizen', 'joao@teste.com', 'João Ferreira');
    await createUser('citizen', 'ana@teste.com', 'Ana Beatriz');
    await createUser('admin', 'gestor@teste.gov.br', 'Marina Duarte');
    joaoToken = await loginAs('joao@teste.com');
    anaToken = await loginAs('ana@teste.com');
    adminToken = await loginAs('gestor@teste.gov.br');
  });

  beforeEach(async () => {
    await truncateTickets();
  });

  afterAll(() => prisma.$disconnect());

  const publicFeed = (token: string) =>
    request(app).get('/api/v1/tickets/public').set('Authorization', `Bearer ${token}`);

  /* ---- o objetivo da rota -------------------------------------------- */

  /**
   * Contraria `GET /tickets`, que lista só os próprios — e é assim de propósito.
   * Se este teste começar a falhar porque alguém "consertou" a rota achando que
   * ela fere o isolamento, a funcionalidade inteira deixou de existir.
   */
  it('mostra a um cidadão os chamados dos OUTROS — é para isso que existe', async () => {
    await openTicket(joaoToken, { title: 'Chamado do João' });
    await openTicket(anaToken, { title: 'Chamado da Ana' });

    const res = await publicFeed(joaoToken).expect(200);

    expect(res.body.total).toBe(2);
    expect(res.body.data).toHaveLength(2);
  });

  it('e `GET /tickets` CONTINUA escopado ao próprio usuário', async () => {
    await openTicket(joaoToken, { title: 'Chamado do João' });
    await openTicket(anaToken, { title: 'Chamado da Ana' });

    const meus = await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${joaoToken}`)
      .expect(200);

    expect(meus.body.data).toHaveLength(1);
    expect(meus.body.data[0].title).toBe('Chamado do João');
  });

  /* ---- a carga: lista de permissão ------------------------------------ */

  it('expõe EXATAMENTE os campos permitidos, e nada mais', async () => {
    await openTicket(anaToken);

    const res = await publicFeed(joaoToken).expect(200);

    expect(Object.keys(res.body.data[0]).sort()).toEqual([
      'categoryLabel',
      'category',
      'createdAt',
      'id',
      'latitude',
      'longitude',
      'protocol',
      'status',
      'statusLabel',
    ].sort());
  });

  it('não carrega nenhum traço de quem abriu', async () => {
    await openTicket(anaToken);

    const bruto = JSON.stringify((await publicFeed(joaoToken).expect(200)).body);

    expect(bruto).not.toContain('ana@teste.com');
    expect(bruto).not.toContain('Ana Beatriz');
    expect(bruto).not.toMatch(/"(userId|citizen|user)"/);
  });

  /* ---- escopo da lista ------------------------------------------------ */

  it('não mostra encaminhados — saíram das mãos do município', async () => {
    const orgao = await createAgency();
    const municipal = await openTicket(anaToken, { title: 'Fica municipal' });
    const externo = await openTicket(anaToken, { title: 'Vai para fora' });

    await request(app)
      .post(`/api/v1/admin/tickets/${externo.id}/forward`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agencyId: orgao.id, note: 'Competência da concessionária.' })
      .expect(200);

    const res = await publicFeed(joaoToken).expect(200);

    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(municipal.id);
  });

  /**
   * O concluído recente é a prova de que o canal funciona; o antigo só afogaria
   * o que está aberto. A janela é de 30 dias sobre `updatedAt`.
   */
  it('mostra concluído recente e esconde concluído antigo', async () => {
    const recente = await openTicket(anaToken, { title: 'Resolvido ontem' });
    const antigo = await openTicket(anaToken, { title: 'Resolvido no ano passado' });

    for (const t of [recente, antigo]) {
      await request(app)
        .patch(`/api/v1/admin/tickets/${t.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('status', 'done')
        .field('note', 'Serviço executado.')
        .expect(200);
    }

    /* `updatedAt` é `@updatedAt`: o Prisma o gerencia e não deixa escrever pelo
       client. SQL direto é o único jeito de envelhecer o registro — e a tabela
       `tickets` não tem o gatilho append-only, que protege só `ticket_events`. */
    await prisma.$executeRawUnsafe(
      `UPDATE tickets SET updated_at = now() - interval '31 days' WHERE id = '${antigo.id}'`
    );

    const res = await publicFeed(joaoToken).expect(200);

    const ids = res.body.data.map((t: { id: string }) => t.id);
    expect(ids).toContain(recente.id);
    expect(ids).not.toContain(antigo.id);
  });

  /* ---- acesso --------------------------------------------------------- */

  it('exige autenticação — não é aberta à internet', async () => {
    await request(app).get('/api/v1/tickets/public').expect(401);
  });

  it('recusa o gestor, como o resto das rotas do cidadão', async () => {
    await request(app)
      .get('/api/v1/tickets/public')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });

  /**
   * `/public` precisa estar registrada ANTES de `/:id`, senão o Express a casa
   * como um identificador e responde 404 — falha que aparece só em execução.
   */
  it('não é confundida com `/tickets/:id`', async () => {
    await openTicket(anaToken);
    const res = await publicFeed(joaoToken).expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  /* ---- detalhe: GET /tickets/public/:id ------------------------------- */

  describe('detalhe de um chamado da cidade', () => {
    const publicDetail = (token: string, id: string) =>
      request(app).get(`/api/v1/tickets/public/${id}`).set('Authorization', `Bearer ${token}`);

    it('mostra a um cidadão o chamado de OUTRO, com texto e andamento', async () => {
      const daAna = await openTicket(anaToken, {
        title: 'Poste apagado na praça',
        description: 'Está apagado há uma semana.',
      });
      await request(app)
        .patch(`/api/v1/admin/tickets/${daAna.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('status', 'in_progress')
        .field('note', 'Equipe de iluminação a caminho.')
        .expect(200);

      const res = await publicDetail(joaoToken, daAna.id).expect(200);

      expect(res.body.title).toBe('Poste apagado na praça');
      expect(res.body.description).toBe('Está apagado há uma semana.');
      expect(res.body.timeline.map((e: { note: string | null }) => e.note)).toContain(
        'Equipe de iluminação a caminho.'
      );
    });

    /**
     * "Tudo menos identidade" dito como teste: a forma é exatamente a do
     * detalhe que a própria autora recebe. Campo novo no detalhe do autor
     * precisa ser decisão consciente para aparecer aqui também — e vice-versa.
     */
    it('tem EXATAMENTE as chaves do detalhe que o próprio autor recebe', async () => {
      const daAna = await openTicket(anaToken);

      const alheio = await publicDetail(joaoToken, daAna.id).expect(200);
      const proprio = await request(app)
        .get(`/api/v1/tickets/${daAna.id}`)
        .set('Authorization', `Bearer ${anaToken}`)
        .expect(200);

      expect(Object.keys(alheio.body).sort()).toEqual(Object.keys(proprio.body).sort());
      expect(Object.keys(alheio.body.timeline[0]).sort()).toEqual(
        Object.keys(proprio.body.timeline[0]).sort()
      );
    });

    it('não carrega nenhum traço de quem abriu', async () => {
      const daAna = await openTicket(anaToken);

      const bruto = JSON.stringify((await publicDetail(joaoToken, daAna.id).expect(200)).body);

      expect(bruto).not.toContain('ana@teste.com');
      expect(bruto).not.toContain('Ana Beatriz');
      expect(bruto).not.toMatch(/"(userId|citizen|user)"/);
    });

    /* A regra de visibilidade é a da lista: saiu dela, o id não abre mais. */

    it('responde 404 para chamado encaminhado', async () => {
      const orgao = await createAgency();
      const externo = await openTicket(anaToken);
      await request(app)
        .post(`/api/v1/admin/tickets/${externo.id}/forward`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ agencyId: orgao.id, note: 'Competência da concessionária.' })
        .expect(200);

      await publicDetail(joaoToken, externo.id).expect(404);
    });

    it('responde 404 para concluído fora da janela de 30 dias', async () => {
      const antigo = await openTicket(anaToken);
      await request(app)
        .patch(`/api/v1/admin/tickets/${antigo.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .field('status', 'done')
        .field('note', 'Serviço executado.')
        .expect(200);
      await prisma.$executeRawUnsafe(
        `UPDATE tickets SET updated_at = now() - interval '31 days' WHERE id = '${antigo.id}'`
      );

      await publicDetail(joaoToken, antigo.id).expect(404);
    });

    it('responde 404 para id inexistente', async () => {
      await publicDetail(joaoToken, '00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('exige autenticação e recusa o gestor', async () => {
      const daAna = await openTicket(anaToken);

      await request(app).get(`/api/v1/tickets/public/${daAna.id}`).expect(401);
      await publicDetail(adminToken, daAna.id).expect(403);
    });
  });
});
