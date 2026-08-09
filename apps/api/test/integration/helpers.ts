import type { Agency, Prisma } from '@prisma/client';
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
  // `agencies` entra na lista para ficar idêntico ao que o seed faz. Seguro
  // porque `vitest.config.ts` fixa `fileParallelism: false`: os arquivos rodam
  // em série contra o mesmo banco.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE ticket_events, tickets, ticket_counters, agencies, users RESTART IDENTITY CASCADE'
  );
}

export async function createUser(role: 'citizen' | 'admin', email: string, name = 'Fulano de Tal') {
  return prisma.user.create({
    data: { name, email, role, passwordHash: await hashPassword(PASSWORD) },
  });
}

/**
 * Cria um órgão externo para o teste usar.
 *
 * Todo teste de encaminhamento PRECISA criar o seu. No CI o banco nasce de
 * `prisma migrate deploy`, sem seed — não existe nenhum órgão lá. Um teste que
 * dependa dos cinco do `seed.ts` passa na máquina do desenvolvedor e quebra no
 * CI, que é o pior lugar para descobrir.
 *
 * Telefone e site vêm preenchidos por padrão porque são o que o cidadão recebe:
 * é a diferença entre um encaminhamento e um beco sem saída.
 */
export function createAgency(overrides: Partial<Prisma.AgencyCreateInput> = {}): Promise<Agency> {
  return prisma.agency.create({
    data: {
      name: 'Concessionária de Energia',
      kind: 'concessionaria',
      publicPhone: '0800 000 0000',
      publicUrl: 'https://exemplo.com.br/atendimento',
      publicNote: 'Rede elétrica, postes e iluminação alimentada pela distribuidora.',
      active: true,
      ...overrides,
    },
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
