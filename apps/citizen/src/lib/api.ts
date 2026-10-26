import { createApiClient } from '@zeladoria/client';
import type {
  CitizenTicketDetailDTO,
  ListPublicTicketsQuery,
  PublicTicketListDTO,
  TicketDTO,
  TicketListDTO,
  TicketSupportDTO,
} from '@zeladoria/shared';

/**
 * Rotas do app do cidadão.
 *
 * Transporte, token e sessão vivem em `@zeladoria/client` — aqui fica só o que
 * é específico deste app: quais endpoints ele chama e o que cada um devolve.
 * Os tipos vêm de `@zeladoria/shared`, os mesmos que o mapper do servidor
 * declara como retorno.
 */
export const client = createApiClient(
  import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api/v1',
);

export function listMyTickets(): Promise<TicketListDTO> {
  return client.request('/tickets');
}

export function getTicket(id: string): Promise<CitizenTicketDetailDTO> {
  return client.request(`/tickets/${id}`);
}

/**
 * Chamados dos OUTROS cidadãos, em projeção reduzida — a lista "Na cidade".
 *
 * Exige estar logado como cidadão: o corte do que ela mostra é feito na origem
 * (ver `listPublicTickets` no servidor), não aqui. Busca, filtros e ordem
 * também: a lista tem teto, e filtrar o que chegou esconderia o que ficou além.
 */
export function listPublicTickets(
  params: Partial<ListPublicTicketsQuery> = {},
): Promise<PublicTicketListDTO> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  return client.request(`/tickets/public${query ? `?${query}` : ''}`);
}

/**
 * Detalhe de um chamado da lista "Na cidade", de qualquer autor. Mesma forma do
 * `getTicket`, sem quem abriu; fora da lista o servidor responde 404.
 */
export function getPublicTicket(id: string): Promise<CitizenTicketDetailDTO> {
  return client.request(`/tickets/public/${id}`);
}

export function createTicket(form: FormData): Promise<TicketDTO> {
  return client.request('/tickets', { method: 'POST', body: form });
}

/** "Eu também vi isso" num chamado de outra pessoa. Idempotente. */
export function supportTicket(id: string): Promise<TicketSupportDTO> {
  return client.request(`/tickets/public/${id}/support`, { method: 'POST' });
}

/** Desfaz o apoio. Idempotente. */
export function withdrawSupport(id: string): Promise<TicketSupportDTO> {
  return client.request(`/tickets/public/${id}/support`, { method: 'DELETE' });
}
