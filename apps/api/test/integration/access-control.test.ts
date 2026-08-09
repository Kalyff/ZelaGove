import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/infra/prisma';
import { app, createUser, loginAs, openTicket, PASSWORD, resetDatabase, truncateTickets } from './helpers';

/**
 * Requisitos 4.6 e 4.7. Estas são as regras que quebram sem ninguém perceber:
 * um filtro esquecido no `where` não derruba a aplicação, só entrega dado de
 * um cidadão para outro em silêncio.
 */
describe('controle de acesso', () => {
  let citizenToken: string;
  let otherToken: string;
  let adminToken: string;

  beforeAll(async () => {
    await resetDatabase();
    await createUser('citizen', 'joao@teste.com', 'João Ferreira');
    await createUser('citizen', 'ana@teste.com', 'Ana Beatriz');
    await createUser('admin', 'gestor@teste.gov.br', 'Marina Duarte');

    citizenToken = await loginAs('joao@teste.com');
    otherToken = await loginAs('ana@teste.com');
    adminToken = await loginAs('gestor@teste.gov.br');
  });

  afterAll(() => prisma.$disconnect());

  it('recusa credenciais inválidas', async () => {
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'joao@teste.com', password: 'errada' })
      .expect(401);
  });

  it('usa a mesma resposta para e-mail inexistente e senha errada', async () => {
    // Respostas diferentes permitiriam enumerar quais contas existem.
    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'joao@teste.com', password: 'errada' });
    const noSuchUser = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ninguem@teste.com', password: PASSWORD });

    expect(wrongPassword.status).toBe(noSuchUser.status);
    expect(wrongPassword.body.error.code).toBe(noSuchUser.body.error.code);
  });

  it('exige autenticação nas rotas protegidas', async () => {
    await request(app).get('/api/v1/tickets').expect(401);
    await request(app).get('/api/v1/admin/tickets').expect(401);
    await request(app).get('/api/v1/admin/metrics').expect(401);
  });

  it('bloqueia cidadão em todas as rotas de administração', async () => {
    const auth = { Authorization: `Bearer ${citizenToken}` };
    await request(app).get('/api/v1/admin/tickets').set(auth).expect(403);
    await request(app).get('/api/v1/admin/tickets/map').set(auth).expect(403);
    await request(app).get('/api/v1/admin/metrics').set(auth).expect(403);
  });

  it('bloqueia gestor nas rotas do cidadão — o gestor não abre chamados', async () => {
    await request(app)
      .get('/api/v1/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);
  });

  describe('isolamento de dados entre cidadãos', () => {
    beforeEach(async () => {
      await truncateTickets();
    });

    it('lista apenas os chamados do próprio usuário', async () => {
      await openTicket(citizenToken, { title: 'Chamado do João' });
      await openTicket(otherToken, { title: 'Chamado da Ana' });

      const res = await request(app)
        .get('/api/v1/tickets')
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Chamado do João');
    });

    it('responde 404 — e não 403 — para chamado de outro cidadão', async () => {
      const alheio = await openTicket(otherToken);

      const res = await request(app)
        .get(`/api/v1/tickets/${alheio.id}`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .expect(404);

      // 403 confirmaria que o chamado existe. 404 não entrega nem isso.
      expect(res.body.error.code).toBe('TICKET_NOT_FOUND');
    });

    it('permite ao gestor ver o chamado de qualquer cidadão, com os dados do solicitante', async () => {
      const ticket = await openTicket(citizenToken);

      const res = await request(app)
        .get(`/api/v1/admin/tickets/${ticket.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.citizen.email).toBe('joao@teste.com');
    });
  });
});
