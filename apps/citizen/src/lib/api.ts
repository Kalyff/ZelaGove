import { createApiClient } from '@zeladoria/client';
import type {
  CitizenTicketDetailDTO,
  PublicTicketListDTO,
  TicketDTO,
  TicketListDTO,
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
 * Chamados de TODOS os cidadãos, em projeção reduzida — a lista "Na cidade".
 *
 * Exige estar logado como cidadão: o corte do que ela mostra é feito na origem
 * (ver `listPublicTickets` no servidor), não aqui.
 */
export function listPublicTickets(): Promise<PublicTicketListDTO> {
  return client.request('/tickets/public');
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
