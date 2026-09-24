/**
 * Contrato HTTP — a forma exata do que a API devolve.
 *
 * Mora aqui, e não em cada `lib/api.ts`, porque é a MESMA verdade dos dois
 * lados do fio: o mapper do servidor declara estes tipos como retorno e os dois
 * clientes os consomem. Com isso, remover um campo da resposta (ou inventar um
 * que o servidor não manda) quebra a compilação em vez de quebrar a tela em
 * produção — antes, cada app mantinha a sua cópia e nada comparava as duas.
 *
 * Só forma. Rótulo em português vem de `labels.ts` e é resolvido na borda do
 * servidor; validação de entrada vem de `schemas.ts`.
 */
import type { AgencyKind, TicketCategory, TicketStatus, UserRole } from './enums';

/**
 * Órgão externo, só com os campos PÚBLICOS.
 *
 * Telefone e site não são detalhe: são o que separa um encaminhamento de um
 * beco sem saída. Sem eles o cidadão sabe que o chamado saiu da prefeitura e
 * não sabe onde cobrar. Campo interno de órgão, se um dia existir, não
 * atravessa este tipo.
 */
export interface AgencyDTO {
  id: string;
  name: string;
  kind: AgencyKind;
  publicPhone: string | null;
  publicUrl: string | null;
  publicNote: string | null;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface TicketDTO {
  id: string;
  protocol: string;
  title: string;
  description: string;
  category: TicketCategory;
  categoryLabel: string;
  status: TicketStatus;
  statusLabel: string;
  latitude: number;
  longitude: number;
  photoUrl: string | null;
  /**
   * Órgão CORRENTE — cache do último encaminhamento, nulo enquanto o chamado
   * for municipal. O histórico de para onde foi cada um está na timeline, e é
   * lá que ele precisa ser lido.
   */
  forwardedTo: AgencyDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEventDTO {
  id: string;
  status: TicketStatus;
  statusLabel: string;
  note: string | null;
  photoUrl: string | null;
  /** Para onde ESTE encaminhamento foi. Nulo em todos os outros eventos. */
  agency: AgencyDTO | null;
  externalProtocol: string | null;
  createdAt: string;
}

/**
 * Chamado de OUTRA pessoa, na LISTA "Na cidade".
 *
 * Deliberadamente magro: sem título, descrição, foto ou qualquer traço de quem
 * abriu — o texto e a foto chegam pelo detalhe (`GET /tickets/public/:id`, que
 * devolve `CitizenTicketDetailDTO`). Não é a `TicketDTO` com campos opcionais —
 * é outro tipo, para que nenhum cartão escreva `ticket.description` achando que
 * existe. Do lado do servidor a mesma lista de campos é a lista de permissão do
 * `select`.
 */
export interface PublicTicketDTO {
  id: string;
  protocol: string;
  category: TicketCategory;
  categoryLabel: string;
  status: TicketStatus;
  statusLabel: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

/** Payload enxuto do mapa do painel (requisito 3.2.4). */
export interface MapPointDTO {
  id: string;
  protocol: string;
  title: string;
  category: TicketCategory;
  status: TicketStatus;
  latitude: number;
  longitude: number;
}

export interface MetricsDTO {
  total: number;
  pending: number;
  inProgress: number;
  done: number;
  forwarded: number;
  /**
   * Mapa completo por status: a soma bate com `total` mesmo quando entrar um
   * status novo, sem depender de a rota lembrar de expor cada um.
   */
  byStatus: Record<TicketStatus, number>;
  recent: TicketDTO[];
}

/**
 * Detalhe como o CIDADÃO o recebe: o chamado mais a linha do tempo completa.
 *
 * Vale para o próprio chamado e para o de outra pessoa aberto em "Na cidade" —
 * mesma forma nos dois casos, e em nenhum deles há quem abriu.
 */
export interface CitizenTicketDetailDTO extends TicketDTO {
  timeline: TimelineEventDTO[];
}

/** Requisito 3.2.6: o gestor vê também nome e e-mail do solicitante. */
export interface AdminTicketDetailDTO extends CitizenTicketDetailDTO {
  citizen: { id: string; name: string; email: string };
}

/** Listagem sem paginação (app do cidadão). */
export interface TicketListDTO {
  data: TicketDTO[];
  total: number;
}

export interface PublicTicketListDTO {
  data: PublicTicketDTO[];
  total: number;
}

/** Listagem paginada do painel. */
export interface TicketPageDTO extends TicketListDTO {
  page: number;
  perPage: number;
}
