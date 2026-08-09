import type { Agency, Prisma, Ticket, TicketEvent } from '@prisma/client';
import { CATEGORY_LABELS, statusLabel, type TicketCategory, type TicketStatus } from '@zeladoria/shared';
import { photoStorage } from '../../infra/storage';

type Audience = 'citizen' | 'admin';

type EventWithAgency = TicketEvent & { agency?: Agency | null };
type TicketWithAgency = Ticket & { forwardedTo?: Agency | null };

/**
 * Só os campos PÚBLICOS do órgão saem para o cliente.
 *
 * O cidadão precisa saber para onde foi e onde cobrar — é isso que separa um
 * encaminhamento de um beco sem saída. Campos internos (se houver, no futuro)
 * não atravessam esta função.
 */
function toAgencyDTO(agency: Agency | null | undefined) {
  if (!agency) return null;
  return {
    id: agency.id,
    name: agency.name,
    kind: agency.kind,
    publicPhone: agency.publicPhone,
    publicUrl: agency.publicUrl,
    publicNote: agency.publicNote,
  };
}

/**
 * Os rótulos são resolvidos aqui, na borda. O enum viaja junto para que o
 * cliente possa colorir badges e agrupar colunas sem depender de string
 * traduzida.
 */
export async function toTicketDTO(ticket: TicketWithAgency, audience: Audience) {
  return {
    // Órgão corrente (cache). O histórico completo está na timeline.
    forwardedTo: toAgencyDTO(ticket.forwardedTo),
    id: ticket.id,
    protocol: ticket.protocol,
    title: ticket.title,
    description: ticket.description,
    category: ticket.category,
    categoryLabel: CATEGORY_LABELS[ticket.category],
    status: ticket.status,
    statusLabel: statusLabel(ticket.status, audience),
    latitude: Number(ticket.latitude),
    longitude: Number(ticket.longitude),
    photoUrl: await photoStorage.urlFor(ticket.photoKey),
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

export async function toTicketListDTO(tickets: TicketWithAgency[], audience: Audience) {
  return Promise.all(tickets.map((t) => toTicketDTO(t, audience)));
}

/**
 * Chamado de OUTRA pessoa, como o cidadão o vê na lista "Na cidade".
 *
 * Função separada de propósito — `toTicketDTO` carrega `description`,
 * `photoUrl` e os dados do encaminhamento, e reusá-la aqui exporia texto livre
 * e foto de terceiros. **A lista de campos abaixo É a lista de permissão**, e o
 * teste de integração compara o conjunto exato de chaves justamente para que
 * um `...ticket` acidental quebre em vez de vazar.
 *
 * `protocol` entra porque é o que permite dizer "já existe o 2026-0000007 para
 * isso"; ele não dá acesso a nada — a leitura do detalhe continua escopada por
 * `userId`.
 */
export function toPublicTicketDTO(ticket: {
  id: string;
  protocol: string;
  category: TicketCategory;
  status: TicketStatus;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  createdAt: Date;
}) {
  return {
    id: ticket.id,
    protocol: ticket.protocol,
    category: ticket.category,
    categoryLabel: CATEGORY_LABELS[ticket.category],
    status: ticket.status,
    statusLabel: statusLabel(ticket.status, 'citizen'),
    latitude: Number(ticket.latitude),
    longitude: Number(ticket.longitude),
    createdAt: ticket.createdAt.toISOString(),
  };
}

export async function toEventDTO(event: EventWithAgency, audience: Audience) {
  return {
    id: event.id,
    status: event.status,
    statusLabel: statusLabel(event.status, audience),
    note: event.note,
    photoUrl: await photoStorage.urlFor(event.photoKey),
    // Para onde ESTE encaminhamento foi. É por isso que o campo mora no evento:
    // um chamado reencaminhado mostra os dois órgãos, cada um no seu momento.
    agency: toAgencyDTO(event.agency),
    externalProtocol: event.externalProtocol,
    createdAt: event.createdAt.toISOString(),
  };
}

export async function toTimelineDTO(events: EventWithAgency[], audience: Audience) {
  return Promise.all(events.map((e) => toEventDTO(e, audience)));
}
