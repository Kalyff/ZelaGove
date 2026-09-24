import type { Prisma } from '@prisma/client';
import type { TicketStatus } from '@zeladoria/shared';
import { Errors } from '../../http/errors';
import { prisma } from '../../infra/prisma';

/**
 * LEITURAS de chamado.
 *
 * Separadas dos comandos (`ticket.service.ts`) porque respondem a perguntas
 * diferentes e é aqui que mora o controle de escopo: quem vê o quê. Um `where`
 * esquecido nestas funções não derruba a aplicação — só entrega o chamado de um
 * cidadão para outro. Manter tudo isso lado a lado torna a comparação entre os
 * recortes possível de fazer com os olhos.
 */

const ticketWithEvents = {
  // `agency` vem junto porque a linha do tempo mostra PARA ONDE cada
  // encaminhamento foi — o dado é do evento, não do chamado.
  events: { orderBy: { createdAt: 'desc' }, include: { agency: true } },
  forwardedTo: true,
} satisfies Prisma.TicketInclude;

/** Requisito 4.6: escopo por userId aplicado na query, não na interface. */
export function listCitizenTickets(userId: string) {
  return prisma.ticket.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    /* O órgão vem na LISTA, não só no detalhe: sem ele o cidadão precisaria
       abrir o chamado para descobrir que ele saiu da prefeitura. */
    include: { forwardedTo: true },
  });
}

export async function getCitizenTicket(userId: string, ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId },
    include: ticketWithEvents,
  });
  if (!ticket) throw Errors.ticketNotFound();
  return ticket;
}

export function listAllTickets(filters: {
  /** Um ou vários. O quadro pede os três operacionais; a visão de
   *  encaminhados pede só `forwarded`. */
  status?: TicketStatus[];
  q?: string;
  skip: number;
  take: number;
}) {
  const where: Prisma.TicketWhereInput = {
    ...(filters.status?.length ? { status: { in: filters.status } } : {}),
    // Requisito 4.8: busca em título E categoria.
    // Nota: a busca por categoria compara o valor do enum ('lighting'), não o
    // rótulo em português. Como o Kanban filtra no cliente por padrão, o
    // usuário digita "Iluminação" e o front resolve pelo rótulo. Este filtro
    // de servidor existe para quando entrar paginação.
    ...(filters.q ? { title: { contains: filters.q, mode: 'insensitive' } } : {}),
  };

  return prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters.skip,
      take: filters.take,
      /* A visão "Encaminhados" é uma listagem, e o órgão é a coluna que a
         justifica existir. */
      include: { forwardedTo: true },
    }),
    prisma.ticket.count({ where }),
  ]);
}

/** Teto da lista pública. Sem paginação por enquanto — ver docs/limitacoes.md. */
const PUBLIC_FEED_LIMIT = 50;

/** Concluído some da lista pública depois disso. */
const PUBLIC_FEED_DONE_WINDOW_DAYS = 30;

/**
 * Quais chamados alheios um cidadão pode ver — a lista "Na cidade" E o detalhe
 * aberto a partir dela. Uma regra só para os dois: um chamado que saiu da lista
 * não pode continuar legível pelo id.
 *
 * `forwarded` fica de fora: saiu das mãos do município, e listá-lo como se
 * fosse fila municipal seria enganoso.
 */
function publicScope(): Prisma.TicketWhereInput {
  const doneSince = new Date(Date.now() - PUBLIC_FEED_DONE_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  return {
    OR: [
      { status: { in: ['pending', 'in_progress'] } },
      // Concluído recente é a prova de que o canal funciona. Sem janela, a
      // lista viraria um arquivo histórico e afogaria o que está aberto.
      { status: 'done', updatedAt: { gte: doneSince } },
    ],
  };
}

/**
 * Chamados de TODOS os cidadãos, para a lista "Na cidade".
 *
 * Com `getPublicTicket`, é o único caminho do sistema que devolve chamado
 * alheio a um cidadão, e é intencional: serve para não abrir chamado duplicado
 * e para ver que a prefeitura executa. Não confunda com `listCitizenTickets`,
 * que segue escopado por `userId` — o isolamento continua valendo em todo o
 * resto.
 *
 * O `select` mantém a lista leve — texto e foto ficam para o detalhe — e deixa
 * `userId` no banco.
 */
export function listPublicTickets() {
  return prisma.ticket.findMany({
    where: publicScope(),
    select: {
      id: true,
      protocol: true,
      category: true,
      status: true,
      latitude: true,
      longitude: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: PUBLIC_FEED_LIMIT,
  });
}

/**
 * Detalhe de um chamado da lista "Na cidade", de qualquer autor.
 *
 * Traz o mesmo que o autor vê — texto, foto e linha do tempo — e NUNCA o
 * `user`: quem abriu não aparece para outro cidadão. Fora de `publicScope`
 * responde 404, igual a um id que não existe.
 */
export async function getPublicTicket(ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, ...publicScope() },
    include: ticketWithEvents,
  });
  if (!ticket) throw Errors.ticketNotFound();
  return ticket;
}

export async function getTicketForAdmin(ticketId: string) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      ...ticketWithEvents,
      // Requisito 3.2.6: o gestor vê nome e e-mail do solicitante.
      user: { select: { id: true, name: true, email: true } },
    },
  });
  if (!ticket) throw Errors.ticketNotFound();
  return ticket;
}

export function listTicketsForMap() {
  return prisma.ticket.findMany({
    select: {
      id: true, protocol: true, title: true, category: true,
      status: true, latitude: true, longitude: true,
    },
  });
}
