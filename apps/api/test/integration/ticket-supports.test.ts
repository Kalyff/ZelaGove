import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/infra/prisma';
import { app, createAgency, createUser, loginAs, openTicket, resetDatabase, truncateTickets } from './helpers';

/**
 * "Eu também vi isso" — `POST` e `DELETE /api/v1/tickets/public/:id/support`.
 *
 * O apoio existe para que vinte avisos do mesmo problema virem UM chamado com
 * vinte apoios, e não vinte chamados. As regras que mais importam: o número
 * conta pessoas, não toques (idempotência + chave primária); o autor não se
 * apoia; e só se apoia o que a lista "Na cidade" mostra.
 */
describe('apoio a chamados ("eu também vi isso")', () => {
  let joaoToken: string;
  let anaToken: string;
  let pedroToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await resetDatabase();
    await createUser('citizen', 'joao@teste.com', 'João Ferreira');
    await createUser('citizen', 'ana@teste.com', 'Ana Beatriz');
    await createUser('citizen', 'pedro@teste.com', 'Pedro Alves');
    await createUser('admin', 'gestor@teste.gov.br', 'Marina Duarte');
    joaoToken = await loginAs('joao@teste.com');
    anaToken = await loginAs('ana@teste.com');
    pedroToken = await loginAs('pedro@teste.com');
    adminToken = await loginAs('gestor@teste.gov.br');
  });

  beforeEach(async () => {
    await truncateTickets();
  });

  afterAll(() => prisma.$disconnect());

  const support = (token: string, id: string) =>
    request(app).post(`/api/v1/tickets/public/${id}/support`).set('Authorization', `Bearer ${token}`);
  const withdraw = (token: string, id: string) =>
    request(app).delete(`/api/v1/tickets/public/${id}/support`).set('Authorization', `Bearer ${token}`);
  const publicDetail = (token: string, id: string) =>
    request(app).get(`/api/v1/tickets/public/${id}`).set('Authorization', `Bearer ${token}`);

  /* ---- o caminho feliz ------------------------------------------------ */

  it('conta o apoio de outro cidadão e o reflete no detalhe', async () => {
    const daAna = await openTicket(anaToken);

    const res = await support(joaoToken, daAna.id).expect(200);
    expect(res.body).toEqual({ supportCount: 1, supportedByMe: true });

    const detalhe = await publicDetail(joaoToken, daAna.id).expect(200);
    expect(detalhe.body.supportCount).toBe(1);
    expect(detalhe.body.supportedByMe).toBe(true);
    expect(detalhe.body.isMine).toBe(false);
  });

  it('soma pessoas diferentes', async () => {
    const daAna = await openTicket(anaToken);

    await support(joaoToken, daAna.id).expect(200);
    const res = await support(pedroToken, daAna.id).expect(200);

    expect(res.body.supportCount).toBe(2);
  });

  /**
   * O número é de PESSOAS. Duplo toque, nova tentativa depois de erro de rede
   * ou script em loop não podem inflá-lo — senão o gestor prioriza pelo
   * cidadão mais insistente, e não pelo problema que afeta mais gente.
   */
  it('não conta duas vezes o mesmo cidadão', async () => {
    const daAna = await openTicket(anaToken);

    await support(joaoToken, daAna.id).expect(200);
    await support(joaoToken, daAna.id).expect(200);
    await Promise.all([support(joaoToken, daAna.id), support(joaoToken, daAna.id)]);

    expect(await prisma.ticketSupport.count({ where: { ticketId: daAna.id } })).toBe(1);
  });

  it('retira o apoio, e retirar de novo não quebra', async () => {
    const daAna = await openTicket(anaToken);
    await support(joaoToken, daAna.id).expect(200);

    const res = await withdraw(joaoToken, daAna.id).expect(200);
    expect(res.body).toEqual({ supportCount: 0, supportedByMe: false });

    await withdraw(joaoToken, daAna.id).expect(200);
    const detalhe = await publicDetail(joaoToken, daAna.id).expect(200);
    expect(detalhe.body.supportedByMe).toBe(false);
  });

  /* ---- recusas -------------------------------------------------------- */

  it('recusa apoiar o próprio chamado', async () => {
    const doJoao = await openTicket(joaoToken);

    const res = await support(joaoToken, doJoao.id).expect(422);

    expect(res.body.error.code).toBe('OWN_TICKET');
    expect(await prisma.ticketSupport.count()).toBe(0);
  });

  it('recusa apoiar chamado concluído', async () => {
    const daAna = await openTicket(anaToken);
    await request(app)
      .patch(`/api/v1/admin/tickets/${daAna.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('status', 'done')
      .field('note', 'Serviço executado.')
      .expect(200);

    const res = await support(joaoToken, daAna.id).expect(422);

    expect(res.body.error.code).toBe('TICKET_ALREADY_DONE');
  });

  /** Só se apoia o que se vê: fora da lista "Na cidade", o id não existe. */
  it('responde 404 para chamado encaminhado', async () => {
    const orgao = await createAgency();
    const daAna = await openTicket(anaToken);
    await request(app)
      .post(`/api/v1/admin/tickets/${daAna.id}/forward`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ agencyId: orgao.id, note: 'Competência da concessionária.' })
      .expect(200);

    await support(joaoToken, daAna.id).expect(404);
  });

  it('responde 404 para id inexistente', async () => {
    await support(joaoToken, '00000000-0000-0000-0000-000000000000').expect(404);
  });

  it('exige autenticação e recusa o gestor', async () => {
    const daAna = await openTicket(anaToken);

    await request(app).post(`/api/v1/tickets/public/${daAna.id}/support`).expect(401);
    await support(adminToken, daAna.id).expect(403);
  });

  /* ---- quem vê o número ----------------------------------------------- */

  it('mostra a contagem na lista "Na cidade"', async () => {
    const daAna = await openTicket(anaToken);
    await support(joaoToken, daAna.id).expect(200);
    await support(pedroToken, daAna.id).expect(200);

    const res = await request(app)
      .get('/api/v1/tickets/public')
      .set('Authorization', `Bearer ${joaoToken}`)
      .expect(200);

    expect(res.body.data[0].supportCount).toBe(2);
  });

  /** O autor vê quantos confirmaram — mas não QUEM. */
  it('mostra ao autor quantos apoiaram, sem dizer quem', async () => {
    const daAna = await openTicket(anaToken);
    await support(joaoToken, daAna.id).expect(200);

    const res = await request(app)
      .get(`/api/v1/tickets/${daAna.id}`)
      .set('Authorization', `Bearer ${anaToken}`)
      .expect(200);

    expect(res.body.supportCount).toBe(1);
    expect(res.body.isMine).toBe(true);
    expect(res.body.supportedByMe).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('João Ferreira');
    expect(JSON.stringify(res.body)).not.toContain('joao@teste.com');
  });

  /** É para isto que o apoio existe: o gestor enxergar a prioridade. */
  it('mostra a contagem ao gestor, no quadro e no detalhe', async () => {
    const daAna = await openTicket(anaToken);
    await support(joaoToken, daAna.id).expect(200);
    await support(pedroToken, daAna.id).expect(200);

    const quadro = await request(app)
      .get('/api/v1/admin/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(quadro.body.data[0].supportCount).toBe(2);

    const detalhe = await request(app)
      .get(`/api/v1/admin/tickets/${daAna.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(detalhe.body.supportCount).toBe(2);
  });

  /** Apoio não é andamento: não entra na linha do tempo nem reordena listas. */
  it('não gera evento nem mexe em updatedAt', async () => {
    const daAna = await openTicket(anaToken);
    const antes = await prisma.ticket.findUniqueOrThrow({ where: { id: daAna.id } });

    await support(joaoToken, daAna.id).expect(200);

    const depois = await prisma.ticket.findUniqueOrThrow({ where: { id: daAna.id } });
    expect(depois.updatedAt).toEqual(antes.updatedAt);
    expect(await prisma.ticketEvent.count({ where: { ticketId: daAna.id } })).toBe(1);
  });
});
