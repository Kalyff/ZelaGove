import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/infra/prisma';
import { app, createAgency, createUser, loginAs, openTicket, resetDatabase, truncateTickets } from './helpers';

/**
 * Lista "Na cidade" — `GET /api/v1/tickets/public`.
 *
 * Esta é a ÚNICA rota do app do cidadão que devolve chamado de outra pessoa, e
 * isso é intencional: serve para não abrir chamado duplicado e para ver que a
 * prefeitura executa. Não é um afrouxamento do isolamento por `userId` — é um
 * caminho adicional cuja carga foi reduzida na ORIGEM, no `select` do
 * `listPublicTickets`, para não conter nada que identifique quem abriu.
 *
 * O teste do conjunto exato de chaves é o mais importante do arquivo: é ele que
 * transforma "lembrar de não expor descrição e foto de terceiro" em "o teste
 * quebra". Sem ele, um `...ticket` distraído vaza texto livre onde as pessoas
 * escrevem o próprio endereço.
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

  it('não vaza descrição, foto nem qualquer traço de quem abriu', async () => {
    await openTicket(anaToken, {
      title: 'Poste apagado em frente à minha casa',
      description: 'Rua das Acácias, 120 — casa da esquina, onde eu moro.',
    });

    const bruto = JSON.stringify((await publicFeed(joaoToken).expect(200)).body);

    // Contra o texto que o cidadão escreveu achando que só a prefeitura leria.
    expect(bruto).not.toContain('Acácias');
    expect(bruto).not.toContain('onde eu moro');
    expect(bruto).not.toContain('Poste apagado');
    expect(bruto).not.toContain('ana@teste.com');
    expect(bruto).not.toContain('Ana Beatriz');
    expect(bruto).not.toMatch(/"(description|photoUrl|photoKey|userId|citizen|user)"/);
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
});
