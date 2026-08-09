import type { Agency } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/infra/prisma';
import { app, createAgency, createUser, loginAs, openTicket, resetDatabase } from './helpers';

/**
 * Encaminhamento a órgão externo.
 *
 * O que estes testes protegem não é o caminho feliz — é o conjunto de regras que
 * falha em SILÊNCIO. Um chamado encaminhado para lugar nenhum não derruba a
 * aplicação: ele fica bonito na tela, some do quadro da prefeitura e nunca chega
 * a órgão nenhum. O cidadão só descobre meses depois, quando o buraco continua lá.
 *
 * A entrega ao órgão é MANUAL por decisão de projeto: o sistema registra e
 * audita, não envia. Por isso o registro é a única coisa que existe — e a única
 * que dá para testar.
 */
describe('encaminhamento a órgão externo', () => {
  let citizenToken: string;
  let adminToken: string;
  let auth: { Authorization: string };
  let energia: Agency;
  let saneamento: Agency;
  let desativado: Agency;

  beforeAll(async () => {
    await resetDatabase();
    await createUser('citizen', 'joao@teste.com', 'João Ferreira');
    await createUser('admin', 'gestor@teste.gov.br', 'Marina Duarte');
    citizenToken = await loginAs('joao@teste.com');
    adminToken = await loginAs('gestor@teste.gov.br');
    auth = { Authorization: `Bearer ${adminToken}` };

    energia = await createAgency();
    saneamento = await createAgency({
      name: 'Companhia de Saneamento',
      publicPhone: '0800 111 1111',
      publicUrl: null,
      publicNote: null,
    });
    desativado = await createAgency({ name: 'Órgão Extinto', active: false });
  });

  /* Os órgãos sobrevivem: `agencies` não está neste TRUNCATE, e nada em
     `agencies` referencia `tickets`, então o CASCADE não a alcança. */
  beforeEach(async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE ticket_events, tickets RESTART IDENTITY CASCADE');
  });

  afterAll(() => prisma.$disconnect());

  const forward = (ticketId: string, body: Record<string, unknown>) =>
    request(app).post(`/api/v1/admin/tickets/${ticketId}/forward`).set(auth).send(body);

  /* ---- órgão e justificativa são obrigatórios ------------------------- */

  it('RECUSA encaminhar sem órgão, e não muda nada pela metade', async () => {
    const ticket = await openTicket(citizenToken);

    const res = await forward(ticket.id, { note: 'É da concessionária de energia.' }).expect(422);
    expect(res.body.error.field).toBe('agencyId');

    const unchanged = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(unchanged.status).toBe('pending');
    expect(unchanged.forwardedToId).toBeNull();
    expect(await prisma.ticketEvent.count({ where: { ticketId: ticket.id } })).toBe(1);
  });

  it('RECUSA encaminhar sem justificativa', async () => {
    const ticket = await openTicket(citizenToken);

    const res = await forward(ticket.id, { agencyId: energia.id, note: '   ' }).expect(422);
    expect(res.body.error.field).toBe('note');

    const unchanged = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(unchanged.status).toBe('pending');
  });

  /* Desativar um órgão preserva o histórico de quem já foi para lá, mas o tira
     do seletor — e a API precisa recusar quem tentar usá-lo assim mesmo. */
  it('RECUSA órgão desativado ou inexistente', async () => {
    const ticket = await openTicket(citizenToken);

    const inativo = await forward(ticket.id, {
      agencyId: desativado.id,
      note: 'Tentando um órgão que não existe mais.',
    }).expect(422);
    expect(inativo.body.error.code).toBe('AGENCY_NOT_FOUND');

    const fantasma = await forward(ticket.id, {
      agencyId: '00000000-0000-4000-8000-000000000000',
      note: 'Órgão que nunca existiu.',
    }).expect(422);
    expect(fantasma.body.error.code).toBe('AGENCY_NOT_FOUND');
  });

  /* ---- o encaminhamento em si ---------------------------------------- */

  it('grava status, evento COM órgão e cache do chamado na mesma transação', async () => {
    const ticket = await openTicket(citizenToken);

    const res = await forward(ticket.id, {
      agencyId: energia.id,
      note: 'Poste na rede de distribuição, fora da iluminação pública municipal.',
    }).expect(200);

    expect(res.body.status).toBe('forwarded');
    // A resposta precisa nomear o destino: o painel a usa para o aviso ao
    // operador, e sem o include ela sairia nula.
    expect(res.body.forwardedTo?.id).toBe(energia.id);

    const salvo = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(salvo.status).toBe('forwarded');
    expect(salvo.forwardedToId).toBe(energia.id);

    const evento = await prisma.ticketEvent.findFirstOrThrow({
      where: { ticketId: ticket.id, status: 'forwarded' },
    });
    // O órgão mora no EVENTO. É isso que torna o reencaminhamento auditável.
    expect(evento.agencyId).toBe(energia.id);
    expect(evento.externalProtocol).toBeNull();
  });

  /**
   * A rota genérica de status também é o caminho do ARRASTO no Kanban, que não
   * tem como informar o órgão. Se ela aceitasse `forwarded`, soltar um card
   * produziria um chamado encaminhado para lugar nenhum — terminal, sem órgão,
   * sem justificativa e fora do quadro.
   */
  it('RECUSA `forwarded` pelo PATCH /status — encaminhar tem rota própria', async () => {
    const ticket = await openTicket(citizenToken);

    await request(app)
      .patch(`/api/v1/admin/tickets/${ticket.id}/status`)
      .set(auth)
      .field('status', 'forwarded')
      .expect(422);

    const unchanged = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(unchanged.status).toBe('pending');
    expect(unchanged.forwardedToId).toBeNull();
  });

  /* ---- protocolo externo, que chega depois ---------------------------- */

  it('anota o protocolo do órgão em evento novo, sem mexer no status', async () => {
    const ticket = await openTicket(citizenToken);
    await forward(ticket.id, { agencyId: energia.id, note: 'Competência da concessionária.' }).expect(200);

    await request(app)
      .post(`/api/v1/admin/tickets/${ticket.id}/external-protocol`)
      .set(auth)
      .send({ externalProtocol: 'ENE-2026-9001', note: 'Informado por telefone.' })
      .expect(200);

    const depois = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(depois.status).toBe('forwarded');
    expect(depois.forwardedToId).toBe(energia.id);

    const anotacao = await prisma.ticketEvent.findFirstOrThrow({
      where: { ticketId: ticket.id, externalProtocol: 'ENE-2026-9001' },
    });
    // Herda o órgão corrente: o número pertence àquele encaminhamento.
    expect(anotacao.agencyId).toBe(energia.id);
    // Abertura + encaminhamento + anotação. Nada foi sobrescrito.
    expect(await prisma.ticketEvent.count({ where: { ticketId: ticket.id } })).toBe(3);
  });

  it('RECUSA anotar protocolo em chamado que não está encaminhado', async () => {
    const ticket = await openTicket(citizenToken);

    const res = await request(app)
      .post(`/api/v1/admin/tickets/${ticket.id}/external-protocol`)
      .set(auth)
      .send({ externalProtocol: 'SAN-2026-1' })
      .expect(422);

    expect(res.body.error.code).toBe('NOT_FORWARDED');
  });

  /* ---- reversão e reencaminhamento ------------------------------------ */

  /**
   * Sair de `forwarded` LIMPA o cache do órgão e PRESERVA o evento.
   *
   * O campo significa "órgão do encaminhamento vigente". Deixá-lo preenchido num
   * chamado que voltou para a fila municipal faria o cidadão ler "é
   * responsabilidade da concessionária" debaixo de um selo "Pendente" — a
   * prefeitura retomou o chamado e pareceria estar empurrando de novo.
   *
   * Sem este teste isso parece um bug, e alguém "conserta" removendo a limpeza.
   */
  it('reverter limpa o órgão corrente mas NÃO apaga o evento', async () => {
    const ticket = await openTicket(citizenToken);
    await forward(ticket.id, { agencyId: energia.id, note: 'Competência da concessionária.' }).expect(200);

    await request(app)
      .patch(`/api/v1/admin/tickets/${ticket.id}/status`)
      .set(auth)
      .field('status', 'pending')
      .field('note', 'Reavaliado: volta para a fila municipal.')
      .expect(200);

    const revertido = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(revertido.status).toBe('pending');
    expect(revertido.forwardedToId).toBeNull();

    // O histórico continua sabendo para onde foi.
    const evento = await prisma.ticketEvent.findFirstOrThrow({
      where: { ticketId: ticket.id, status: 'forwarded' },
    });
    expect(evento.agencyId).toBe(energia.id);
  });

  it('reencaminhar a outro órgão preserva os DOIS na linha do tempo', async () => {
    const ticket = await openTicket(citizenToken);

    await forward(ticket.id, { agencyId: energia.id, note: 'Parecia ser da energia.' }).expect(200);
    await request(app)
      .patch(`/api/v1/admin/tickets/${ticket.id}/status`)
      .set(auth)
      .field('status', 'pending')
      .field('note', 'Reavaliado.')
      .expect(200);
    await forward(ticket.id, { agencyId: saneamento.id, note: 'Na verdade é do saneamento.' }).expect(200);

    const detalhe = await request(app).get(`/api/v1/admin/tickets/${ticket.id}`).set(auth).expect(200);

    // A timeline vem do mais recente para o mais antigo.
    const orgaos = detalhe.body.timeline
      .filter((e: { agency: unknown }) => e.agency)
      .map((e: { agency: { name: string } }) => e.agency.name);

    expect(orgaos).toEqual(['Companhia de Saneamento', 'Concessionária de Energia']);
    expect(detalhe.body.forwardedTo.name).toBe('Companhia de Saneamento');
  });

  /* ---- listagem, quadro e métricas ------------------------------------ */

  it('o quadro não recebe encaminhados, e a visão filtrada pagina', async () => {
    const operacional = await openTicket(citizenToken, { title: 'Segue municipal' });
    for (const n of [1, 2, 3]) {
      const t = await openTicket(citizenToken, { title: `Encaminhado ${n}` });
      await forward(t.id, { agencyId: energia.id, note: `Competência externa ${n}.` }).expect(200);
    }

    /* Sem este filtro os encaminhados ocupariam o teto de 100 linhas do quadro
       sem aparecer em coluna nenhuma, empurrando PENDENTES para fora. */
    const quadro = await request(app)
      .get('/api/v1/admin/tickets?status=pending,in_progress,done&perPage=100')
      .set(auth)
      .expect(200);
    expect(quadro.body.total).toBe(1);
    expect(quadro.body.data[0].id).toBe(operacional.id);

    const p1 = await request(app)
      .get('/api/v1/admin/tickets?status=forwarded&perPage=2&page=1')
      .set(auth)
      .expect(200);
    const p2 = await request(app)
      .get('/api/v1/admin/tickets?status=forwarded&perPage=2&page=2')
      .set(auth)
      .expect(200);

    expect(p1.body.total).toBe(3);
    expect(p1.body.data).toHaveLength(2);
    expect(p2.body.data).toHaveLength(1);

    const ids = new Set(p1.body.data.map((t: { id: string }) => t.id));
    expect(p2.body.data.some((t: { id: string }) => ids.has(t.id))).toBe(false);

    // Na LISTA o órgão precisa vir junto — é a coluna que justifica a tela.
    expect(p1.body.data[0].forwardedTo?.name).toBe('Concessionária de Energia');
  });

  /* Os contadores fixos da rota descartavam qualquer status que não fossem os
     três originais: `forwarded` entrava no groupBy e sumia, e a soma deixava de
     bater com o total sem ninguém perceber. */
  it('as métricas fecham com o total, contando os encaminhados', async () => {
    await openTicket(citizenToken, { title: 'Pendente' });
    const paraEncaminhar = await openTicket(citizenToken, { title: 'Vai para fora' });
    await forward(paraEncaminhar.id, { agencyId: energia.id, note: 'Competência externa.' }).expect(200);

    const m = await request(app).get('/api/v1/admin/metrics').set(auth).expect(200);

    expect(m.body.forwarded).toBe(1);
    expect(m.body.pending + m.body.inProgress + m.body.done + m.body.forwarded).toBe(m.body.total);

    const somaDoMapa = Object.values(m.body.byStatus as Record<string, number>).reduce(
      (a, b) => a + b,
      0,
    );
    expect(somaDoMapa).toBe(m.body.total);
  });

  /* ---- o que o cidadão recebe ----------------------------------------- */

  /**
   * Sem órgão e sem caminho de acompanhamento, "Encaminhado" é só a prefeitura
   * dizendo que o problema não é dela. O contato público é o que separa um
   * encaminhamento de um beco sem saída.
   */
  it('entrega ao cidadão o órgão e o contato — no detalhe E na listagem', async () => {
    const ticket = await openTicket(citizenToken);
    await forward(ticket.id, {
      agencyId: energia.id,
      note: 'Rede de distribuição da concessionária.',
      externalProtocol: 'ENE-2026-4477',
    }).expect(200);

    const cidadao = { Authorization: `Bearer ${citizenToken}` };

    const detalhe = await request(app).get(`/api/v1/tickets/${ticket.id}`).set(cidadao).expect(200);
    expect(detalhe.body.statusLabel).toBe('Encaminhado');
    expect(detalhe.body.forwardedTo).toMatchObject({
      name: 'Concessionária de Energia',
      publicPhone: '0800 000 0000',
      publicUrl: 'https://exemplo.com.br/atendimento',
    });
    expect(detalhe.body.timeline[0].agency.name).toBe('Concessionária de Energia');
    expect(detalhe.body.timeline[0].externalProtocol).toBe('ENE-2026-4477');

    // A listagem também: descobrir que o chamado saiu da prefeitura não pode
    // exigir abrir o chamado.
    const lista = await request(app).get('/api/v1/tickets').set(cidadao).expect(200);
    expect(lista.body.data[0].forwardedTo?.name).toBe('Concessionária de Energia');
  });

  it('não vaza campo interno do órgão para o cidadão', async () => {
    const ticket = await openTicket(citizenToken);
    await forward(ticket.id, { agencyId: energia.id, note: 'Competência externa.' }).expect(200);

    const detalhe = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set({ Authorization: `Bearer ${citizenToken}` })
      .expect(200);

    /* `toAgencyDTO` é uma lista de permissão: só campos públicos atravessam.
       Se alguém trocar por `...agency`, isto quebra — que é o objetivo. */
    expect(Object.keys(detalhe.body.forwardedTo).sort()).toEqual([
      'id',
      'kind',
      'name',
      'publicNote',
      'publicPhone',
      'publicUrl',
    ]);
  });

  it('a lista de órgãos é só do gestor', async () => {
    await request(app)
      .get('/api/v1/admin/agencies')
      .set({ Authorization: `Bearer ${citizenToken}` })
      .expect(403);

    const res = await request(app).get('/api/v1/admin/agencies').set(auth).expect(200);
    const nomes = res.body.data.map((a: { name: string }) => a.name);
    expect(nomes).toContain('Concessionária de Energia');
    // Desativado não aparece no seletor, mas continua existindo no histórico.
    expect(nomes).not.toContain('Órgão Extinto');
  });
});
