import type { Agency, Prisma, Ticket, TicketEvent } from '@prisma/client';
import {
  CATEGORY_LABELS,
  statusLabel,
  type MapPointDTO,
  type PublicTicketDTO,
  type TicketCategory,
  type TicketDTO,
  type TicketStatus,
  type TimelineEventDTO,
} from '@zeladoria/shared';
import { photoStorage } from '../../infra/storage';
import { toAgencyDTO } from '../agencies/agency.mapper';

/**
 * Borda de saída da API.
 *
 * O tipo de retorno de cada função é o DTO declarado em `@zeladoria/shared` —
 * o MESMO que os dois clientes consomem. Isso não é decoração: o TypeScript
 * recusa propriedade excedente em literal de retorno, então tirar um campo da
 * resposta (ou inventar um que o cliente não espera) quebra a compilação em vez
 * de quebrar a tela em produção. Antes, cada app mantinha a sua cópia dos tipos
 * e nada comparava as duas.
 */

type Audience = 'citizen' | 'admin';

type EventWithAgency = TicketEvent & { agency?: Agency | null };
type TicketWithAgency = Ticket & { forwardedTo?: Agency | null };

/**
 * Os rótulos são resolvidos aqui, na borda. O enum viaja junto para que o
 * cliente possa colorir badges e agrupar colunas sem depender de string
 * traduzida.
 */
export async function toTicketDTO(
  ticket: TicketWithAgency,
  audience: Audience
): Promise<TicketDTO> {
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

export async function toTicketListDTO(
  tickets: TicketWithAgency[],
  audience: Audience
): Promise<TicketDTO[]> {
  return Promise.all(tickets.map((t) => toTicketDTO(t, audience)));
}

/**
 * Chamado de OUTRA pessoa, como o cidadão o vê na lista "Na cidade".
 *
 * Função separada de propósito — `toTicketDTO` carrega `description`,
 * `photoUrl` e os dados do encaminhamento, e reusá-la aqui exporia texto livre
 * e foto de terceiros. **A lista de campos abaixo É a lista de permissão**, e o
 * teste de integração compara o conjunto exato de chaves justamente para que um
 * `...ticket` acidental quebre em vez de vazar. (O tipo de retorno reforça, mas
 * não substitui o teste: spread escapa da checagem de propriedade excedente.)
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
}): PublicTicketDTO {
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

/**
 * Payload enxuto do mapa (requisito 3.2.4): sem descrição, sem foto, sem
 * timeline. São até milhares de pontos numa resposta só.
 */
export function toMapPointDTO(ticket: {
  id: string;
  protocol: string;
  title: string;
  category: TicketCategory;
  status: TicketStatus;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
}): MapPointDTO {
  return {
    id: ticket.id,
    protocol: ticket.protocol,
    title: ticket.title,
    category: ticket.category,
    status: ticket.status,
    latitude: Number(ticket.latitude),
    longitude: Number(ticket.longitude),
  };
}

export async function toEventDTO(
  event: EventWithAgency,
  audience: Audience
): Promise<TimelineEventDTO> {
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

export async function toTimelineDTO(
  events: EventWithAgency[],
  audience: Audience
): Promise<TimelineEventDTO[]> {
  return Promise.all(events.map((e) => toEventDTO(e, audience)));
}
