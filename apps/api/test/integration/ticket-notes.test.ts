import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/infra/prisma';
import { app, createUser, loginAs, openTicket, resetDatabase, truncateTickets } from './helpers';

/**
 * Observação do gestor: entra na linha do tempo SEM mudar o status, e o
 * cidadão a lê marcada como observação — não como uma nova transição.
 */
describe('observações na linha do tempo', () => {
  let citizenToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await resetDatabase();
    await createUser('citizen', 'joao@teste.com', 'João Ferreira');
    await createUser('admin', 'gestor@teste.gov.br', 'Marina Duarte');
    citizenToken = await loginAs('joao@teste.com');
    adminToken = await loginAs('gestor@teste.gov.br');
  });

  beforeEach(async () => {
    await truncateTickets();
  });

  afterAll(() => prisma.$disconnect());

  it('registra a observação sem mudar o status e o cidadão a vê', async () => {
    const ticket = await openTicket(citizenToken);
    await request(app)
      .patch(`/api/v1/admin/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('status', 'in_progress')
      .expect(200);

    const res = await request(app)
      .post(`/api/v1/admin/tickets/${ticket.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('note', 'Material solicitado ao almoxarifado.')
      .expect(200);
    expect(res.body.status).toBe('in_progress');

    const detail = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(detail.body.status).toBe('in_progress');
    expect(detail.body.timeline).toHaveLength(3);
    expect(detail.body.timeline[0]).toMatchObject({
      kind: 'note',
      status: 'in_progress',
      note: 'Material solicitado ao almoxarifado.',
    });
    // As transições continuam marcadas como tal.
    expect(detail.body.timeline[1].kind).toBe('status');
    expect(detail.body.timeline[2].kind).toBe('status');
  });

  it('recusa observação vazia, apontando o campo, sem gravar evento', async () => {
    const ticket = await openTicket(citizenToken);

    const res = await request(app)
      .post(`/api/v1/admin/tickets/${ticket.id}/notes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('note', '   ')
      .expect(422);

    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('note');
    expect(await prisma.ticketEvent.count({ where: { ticketId: ticket.id } })).toBe(1);
  });

  it('não permite ao cidadão inserir observação', async () => {
    const ticket = await openTicket(citizenToken);
    await request(app)
      .post(`/api/v1/admin/tickets/${ticket.id}/notes`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('note', 'Já resolvi.')
      .expect(403);
  });
});
