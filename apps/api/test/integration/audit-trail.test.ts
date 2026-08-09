import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../src/infra/prisma';
import { createUser, loginAs, openTicket, resetDatabase, truncateTickets } from './helpers';

/**
 * Requisito 4.2. A garantia de imutabilidade vive no BANCO, não no service —
 * se dependesse do código da aplicação, qualquer script de manutenção ou
 * acesso direto ao Postgres a quebraria em silêncio. Estes testes atacam o
 * banco por fora, de propósito.
 */
describe('trilha de auditoria', () => {
  let citizenToken: string;

  beforeAll(async () => {
    await resetDatabase();
    await createUser('citizen', 'joao@teste.com', 'João Ferreira');
    citizenToken = await loginAs('joao@teste.com');
  });

  beforeEach(async () => {
    await truncateTickets();
  });

  afterAll(() => prisma.$disconnect());

  it('recusa UPDATE em evento do histórico', async () => {
    const ticket = await openTicket(citizenToken);
    const event = await prisma.ticketEvent.findFirstOrThrow({ where: { ticketId: ticket.id } });

    await expect(
      prisma.$executeRawUnsafe(`UPDATE ticket_events SET note = 'adulterado' WHERE id = '${event.id}'`)
    ).rejects.toThrow();

    const untouched = await prisma.ticketEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(untouched.note).toBe('Chamado aberto');
  });

  it('recusa DELETE em evento do histórico', async () => {
    const ticket = await openTicket(citizenToken);
    const event = await prisma.ticketEvent.findFirstOrThrow({ where: { ticketId: ticket.id } });

    await expect(
      prisma.$executeRawUnsafe(`DELETE FROM ticket_events WHERE id = '${event.id}'`)
    ).rejects.toThrow();

    expect(await prisma.ticketEvent.count({ where: { id: event.id } })).toBe(1);
  });

  it('impede apagar chamado que já tem histórico', async () => {
    const ticket = await openTicket(citizenToken);
    // onDelete: Restrict — chamado com trilha não some do sistema.
    await expect(prisma.ticket.delete({ where: { id: ticket.id } })).rejects.toThrow();
  });
});

describe('protocolo sequencial anual', () => {
  let citizenToken: string;

  beforeAll(async () => {
    await resetDatabase();
    await createUser('citizen', 'joao@teste.com', 'João Ferreira');
    citizenToken = await loginAs('joao@teste.com');
  });

  afterAll(() => prisma.$disconnect());

  it('numera sem lacunas e no formato AAAA-NNNNNNN', async () => {
    const year = new Date().getFullYear();
    const first = await openTicket(citizenToken, { title: 'Primeiro' });
    const second = await openTicket(citizenToken, { title: 'Segundo' });
    const third = await openTicket(citizenToken, { title: 'Terceiro' });

    expect(first.protocol).toBe(`${year}-0000001`);
    expect(second.protocol).toBe(`${year}-0000002`);
    expect(third.protocol).toBe(`${year}-0000003`);
  });

  it('não repete número sob criação concorrente', async () => {
    await prisma.$executeRawUnsafe('TRUNCATE TABLE ticket_events, tickets, ticket_counters RESTART IDENTITY CASCADE');

    const created = await Promise.all(
      Array.from({ length: 8 }, (_, i) => openTicket(citizenToken, { title: `Simultâneo ${i}` }))
    );

    const protocols = created.map((t) => t.protocol);
    expect(new Set(protocols).size).toBe(protocols.length);
  });
});
