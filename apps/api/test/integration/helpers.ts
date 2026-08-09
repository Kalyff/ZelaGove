import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/infra/prisma';
import { hashPassword } from '../../src/modules/auth/password';

export const app: Express = createApp();

export const PASSWORD = 'senha-de-teste-123';

/**
 * TRUNCATE, não deleteMany: o trigger append-only recusa DELETE em
 * ticket_events. Se este helper parar de funcionar, é sinal de que alguém
 * removeu a proteção — o que é exatamente o que queremos que quebre alto.
 */
export async function resetDatabase() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE ticket_events, tickets, ticket_counters, users RESTART IDENTITY CASCADE'
  );
}

export async function createUser(role: 'citizen' | 'admin', email: string, name = 'Fulano de Tal') {
  return prisma.user.create({
    data: { name, email, role, passwordHash: await hashPassword(PASSWORD) },
  });
}

export async function loginAs(email: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return res.body.accessToken as string;
}

export async function openTicket(token: string, overrides: Record<string, string> = {}) {
  const res = await request(app)
    .post('/api/v1/tickets')
    .set('Authorization', `Bearer ${token}`)
    .field('title', overrides.title ?? 'Buraco na via')
    .field('description', overrides.description ?? 'Buraco grande em frente ao número 120.')
    .field('category', overrides.category ?? 'paving')
    .field('latitude', overrides.latitude ?? '-9.97499')
    .field('longitude', overrides.longitude ?? '-67.8243')
    .expect(201);
  return res.body;
}
