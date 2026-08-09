import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/infra/prisma';
import { updateTicketStatus } from '../../src/modules/tickets/ticket.service';
import { app, createUser, loginAs, openTicket, resetDatabase, truncateTickets } from './helpers';

describe('ciclo de vida do chamado', () => {
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

  it('nasce Pendente com o evento de abertura já registrado', async () => {
    const ticket = await openTicket(citizenToken);
    expect(ticket.status).toBe('pending');

    const detail = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(detail.body.timeline).toHaveLength(1);
    expect(detail.body.timeline[0].status).toBe('pending');
    expect(detail.body.timeline[0].note).toBe('Chamado aberto');
  });

  it('mostra "Em Deslocamento" ao cidadão e "Em Andamento" ao gestor', async () => {
    const ticket = await openTicket(citizenToken);
    await request(app)
      .patch(`/api/v1/admin/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('status', 'in_progress')
      .expect(200);

    const citizenView = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);
    const adminView = await request(app)
      .get(`/api/v1/admin/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(citizenView.body.statusLabel).toBe('Em Deslocamento');
    expect(adminView.body.statusLabel).toBe('Em Andamento');
    // Um único valor no banco para os dois rótulos.
    expect(citizenView.body.status).toBe(adminView.body.status);
  });

  it('RECUSA conclusão sem observação', async () => {
    const ticket = await openTicket(citizenToken);

    const res = await request(app)
      .patch(`/api/v1/admin/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('status', 'done')
      .expect(422);

    /**
     * `VALIDATION_ERROR`, e não `COMPLETION_NOTE_REQUIRED`.
     *
     * A regra tem DUAS linhas de defesa, e pelo HTTP quem responde é sempre a
     * primeira: a rota faz `updateTicketStatusSchema.parse` antes de chamar o
     * service, então o ZodError vira `VALIDATION_ERROR` no errorHandler e o
     * `Errors.completionNoteRequired()` nunca chega a ser lançado por esse
     * caminho. Este teste afirmava o contrário e falhava — só ninguém tinha
     * rodado a suíte de integração para descobrir.
     *
     * O que importa para quem consome a API é o par status + `field`, que é o
     * que o modal do painel usa para colocar a mensagem no campo certo. A
     * segunda linha de defesa é exercida logo abaixo, chamando o service direto.
     */
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.field).toBe('note');

    // E o status não pode ter mudado pela metade.
    const unchanged = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(unchanged?.status).toBe('pending');
    expect(await prisma.ticketEvent.count({ where: { ticketId: ticket.id } })).toBe(1);
  });

  /**
   * A segunda linha de defesa, sem passar pelo schema.
   *
   * Existe porque o service é chamado por outros caminhos além da rota HTTP —
   * seed, scripts de manutenção, e qualquer código futuro. Se a guarda sumir
   * daqui, um chamado pode ser concluído sem ninguém documentar o que foi feito,
   * e a auditoria vira ficção.
   */
  it('o service recusa conclusão sem observação mesmo sem o schema', async () => {
    const ticket = await openTicket(citizenToken);
    const admin = await prisma.user.findFirstOrThrow({ where: { role: 'admin' } });

    await expect(
      updateTicketStatus(ticket.id, admin.id, { status: 'done', note: '   ' }, null),
    ).rejects.toMatchObject({ code: 'COMPLETION_NOTE_REQUIRED', status: 422, field: 'note' });

    const unchanged = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(unchanged?.status).toBe('pending');
  });

  it('conclui com observação e entrega a nota ao cidadão', async () => {
    const ticket = await openTicket(citizenToken);

    await request(app)
      .patch(`/api/v1/admin/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('status', 'done')
      .field('note', 'Buraco tapado com massa asfáltica.')
      .expect(200);

    const detail = await request(app)
      .get(`/api/v1/tickets/${ticket.id}`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .expect(200);

    expect(detail.body.status).toBe('done');
    // Requisito 4.2: transparência — a nota do gestor chega ao cidadão.
    expect(detail.body.timeline[0].note).toBe('Buraco tapado com massa asfáltica.');
    expect(detail.body.timeline).toHaveLength(2);
  });

  it('permite voltar de Em Andamento para Pendente — a transição é livre', async () => {
    const ticket = await openTicket(citizenToken);
    const auth = { Authorization: `Bearer ${adminToken}` };

    await request(app).patch(`/api/v1/admin/tickets/${ticket.id}/status`).set(auth).field('status', 'in_progress').expect(200);
    const back = await request(app).patch(`/api/v1/admin/tickets/${ticket.id}/status`).set(auth).field('status', 'pending').expect(200);

    expect(back.body.status).toBe('pending');
    // Cada transição gera evento: nada é sobrescrito.
    expect(await prisma.ticketEvent.count({ where: { ticketId: ticket.id } })).toBe(3);
  });

  it('não permite ao cidadão alterar status', async () => {
    const ticket = await openTicket(citizenToken);
    await request(app)
      .patch(`/api/v1/admin/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('status', 'done')
      .field('note', 'resolvi sozinho')
      .expect(403);
  });

  it('recusa categoria fora da lista fixa', async () => {
    await request(app)
      .post('/api/v1/tickets')
      .set('Authorization', `Bearer ${citizenToken}`)
      .field('title', 'Teste')
      .field('description', 'Descrição de teste.')
      .field('category', 'inventada')
      .field('latitude', '-9.9')
      .field('longitude', '-67.8')
      .expect(422);
  });
});
