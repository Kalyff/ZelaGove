import type { Prisma } from '@prisma/client';
import type { ListPublicTicketsQuery, PublicFeedSort, TicketStatus } from '@zeladoria/shared';
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

/**
 * O que toda leitura que vira `TicketDTO` precisa trazer junto — inclusive as
 * dos comandos, que devolvem o chamado atualizado.
 *
 * Um fragmento só porque o mapper EXIGE `_count.supports` no tipo: quem
 * esquecer a contagem não compila, em vez de mostrar "0 apoios" num chamado que
 * tem vinte.
 */
export const ticketForDTO = {
  /* O órgão vem também nas LISTAS, não só no detalhe: sem ele o cidadão
     precisaria abrir o chamado para descobrir que ele saiu da prefeitura. */
  forwardedTo: true,
  _count: { select: { supports: true } },
} satisfies Prisma.TicketInclude;

const ticketWithEvents = {
  ...ticketForDTO,
  // `agency` vem junto porque a linha do tempo mostra PARA ONDE cada
  // encaminhamento foi — o dado é do evento, não do chamado.
  events: { orderBy: { createdAt: 'desc' }, include: { agency: true } },
} satisfies Prisma.TicketInclude;

/**
 * Detalhe como o cidadão o vê: o de sempre, mais o apoio DE QUEM ESTÁ VENDO.
 * O filtro por `viewerId` faz `supports` voltar com zero ou um item — nunca a
 * lista de quem apoiou.
 */
function ticketForViewer(viewerId: string) {
  return {
    ...ticketWithEvents,
    supports: { where: { userId: viewerId }, select: { userId: true } },
  } satisfies Prisma.TicketInclude;
}

/** Requisito 4.6: escopo por userId aplicado na query, não na interface. */
export function listCitizenTickets(userId: string) {
  return prisma.ticket.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: ticketForDTO,
  });
}

export async function getCitizenTicket(userId: string, ticketId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, userId },
    include: ticketForViewer(userId),
  });
  if (!ticket) throw Errors.ticketNotFound();
  return ticket;
}

/**
 * A busca por texto das listagens: título (sem diferenciar maiúsculas) ou
 * protocolo. Uma só para o painel e para "Na cidade", para "achar pelo
 * protocolo" querer dizer a mesma coisa nas duas pontas.
 *
 * A categoria fica de fora: compará-la aqui seria comparar o valor do enum
 * ('lighting'), não o rótulo em português que a pessoa digita. Cada lista tem
 * a sua forma de filtrar por categoria.
 */
function searchWhere(q: string): Prisma.TicketWhereInput {
  return {
    OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { protocol: { contains: q } },
    ],
  };
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
    // Requisito 4.8: busca em título E categoria — a categoria o Kanban filtra
    // no cliente, pelo rótulo em português. O quadro pergunta ao servidor
    // quando recebe um protocolo completo: o chamado pode estar fora das linhas
    // que ele carregou (encaminhado ou antigo).
    ...(filters.q ? searchWhere(filters.q) : {}),
  };

  return prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters.skip,
      take: filters.take,
      /* A visão "Encaminhados" é uma listagem, e o órgão é a coluna que a
         justifica existir. A contagem de apoios é o que o quadro mostra no
         card. */
      include: ticketForDTO,
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
 *
 * Exportada porque é também a regra de quais chamados aceitam apoio
 * (`ticket.service.ts`): só se apoia o que se consegue ver.
 */
export function publicScope(): Prisma.TicketWhereInput {
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

const PUBLIC_FEED_ORDER: Record<PublicFeedSort, Prisma.TicketOrderByWithRelationInput[]> = {
  recent: [{ createdAt: 'desc' }],
  /* Os que esperam há mais tempo — o que a cidade mais deve. */
  oldest: [{ createdAt: 'asc' }],
  /* Empate de apoios (o caso comum: zero) desempata pelo mais novo, para a
     ordem não variar entre uma busca e outra. */
  supports: [{ supports: { _count: 'desc' } }, { createdAt: 'desc' }],
};

/**
 * Chamados dos OUTROS cidadãos, para a lista "Na cidade".
 *
 * Com `getPublicTicket`, é o único caminho do sistema que devolve chamado
 * alheio a um cidadão, e é intencional: serve para não abrir chamado duplicado
 * e para ver que a prefeitura executa. Não confunda com `listCitizenTickets`,
 * que segue escopado por `userId` — o isolamento continua valendo em todo o
 * resto.
 *
 * Os chamados de quem vê ficam de fora: na lista da cidade eles confundiam, e
 * já estão em "Meus chamados". O DETALHE continua abrindo para o autor
 * (`getPublicTicket` não filtra) — é o link que ele mesmo compartilha.
 *
 * Busca, filtros e ordem entram num `AND` com `publicScope`: nenhum deles pode
 * afrouxar o escopo, só estreitar. E entram ANTES do teto, para filtrar o que
 * existe e não só o que coube nos 50.
 *
 * O `select` mantém a lista leve — descrição e foto ficam para o detalhe — e
 * deixa `userId` no banco.
 */
export function listPublicTickets(viewerId: string, filters: ListPublicTicketsQuery) {
  const where: Prisma.TicketWhereInput = {
    AND: [
      publicScope(),
      { userId: { not: viewerId } },
      ...(filters.status ? [{ status: filters.status }] : []),
      ...(filters.category ? [{ category: filters.category }] : []),
      ...(filters.q ? [searchWhere(filters.q)] : []),
    ],
  };

  return prisma.$transaction([
    prisma.ticket.findMany({
      where,
      select: {
        id: true,
        protocol: true,
        title: true,
        category: true,
        status: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        _count: { select: { supports: true } },
      },
      orderBy: PUBLIC_FEED_ORDER[filters.sort],
      take: PUBLIC_FEED_LIMIT,
    }),
    /* O total do filtro, não do que voltou: é o que deixa a tela dizer
       "mostrando 50 de 132" em vez de fingir que a lista acabou. */
    prisma.ticket.count({ where }),
  ]);
}

/**
 * Detalhe de um chamado da lista "Na cidade", de qualquer autor.
 *
 * Traz o mesmo que o autor vê — texto, foto e linha do tempo — e NUNCA o
 * `user`: quem abriu não aparece para outro cidadão. Fora de `publicScope`
 * responde 404, igual a um id que não existe.
 *
 * `viewerId` é quem está vendo, e serve só para dizer se ELE já apoiou e se o
 * chamado é dele — o `userId` do chamado é comparado no mapper e não sai.
 */
export async function getPublicTicket(ticketId: string, viewerId: string) {
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, ...publicScope() },
    include: ticketForViewer(viewerId),
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
