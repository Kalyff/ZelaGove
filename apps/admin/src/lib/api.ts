import { createApiClient } from '@zeladoria/client';
import type {
  AdminTicketDetailDTO,
  AgencyDTO,
  MapPointDTO,
  MetricsDTO,
  TicketDTO,
  TicketPageDTO,
  TicketStatus,
} from '@zeladoria/shared';

/**
 * Rotas do painel da prefeitura.
 *
 * Transporte, token e sessão vivem em `@zeladoria/client` — aqui fica só o que
 * é específico deste app. Os tipos vêm de `@zeladoria/shared`, os mesmos que o
 * mapper do servidor declara como retorno.
 */
export const client = createApiClient(
  import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api/v1',
);

/**
 * O quadro pede explicitamente os três status operacionais.
 *
 * Sem o filtro, os encaminhados voltariam a ocupar o teto de 100 linhas: eles
 * sumiriam da tela (o quadro só tem três colunas) enquanto empurram chamados
 * PENDENTES para fora da resposta. Perda de dado com cara de layout.
 */
export function listTickets(
  params: { status?: TicketStatus[]; page?: number; perPage?: number } = {},
): Promise<TicketPageDTO> {
  const qs = new URLSearchParams({ perPage: String(params.perPage ?? 100) });
  if (params.status?.length) qs.set('status', params.status.join(','));
  if (params.page) qs.set('page', String(params.page));
  return client.request(`/admin/tickets?${qs}`);
}

export function getTicket(id: string): Promise<AdminTicketDetailDTO> {
  return client.request(`/admin/tickets/${id}`);
}

export function listMapPoints(): Promise<{ data: MapPointDTO[] }> {
  return client.request('/admin/tickets/map');
}

export function getMetrics(): Promise<MetricsDTO> {
  return client.request('/admin/metrics');
}

export function listAgencies(): Promise<{ data: AgencyDTO[] }> {
  return client.request('/admin/agencies');
}

export function updateStatus(input: {
  id: string;
  status: TicketStatus;
  note?: string;
  photo?: File | null;
}): Promise<TicketDTO> {
  const form = new FormData();
  form.append('status', input.status);
  if (input.note) form.append('note', input.note);
  if (input.photo) form.append('photo', input.photo);
  return client.request(`/admin/tickets/${input.id}/status`, { method: 'PATCH', body: form });
}

/**
 * Encaminha a órgão externo. Rota própria, não o PATCH de status — o arrasto do
 * Kanban usa aquela e não teria como informar o órgão.
 *
 * ATENÇÃO: isto REGISTRA o encaminhamento; não entrega nada a ninguém. A
 * entrega ao órgão é manual, e a interface precisa dizer isso.
 */
export function forwardTicket(input: {
  id: string;
  agencyId: string;
  note: string;
  externalProtocol?: string;
}): Promise<TicketDTO> {
  const { id, ...body } = input;
  return client.request(`/admin/tickets/${id}/forward`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Anota o protocolo devolvido pelo órgão — quase sempre dias depois. */
export function appendExternalProtocol(input: {
  id: string;
  externalProtocol: string;
  note?: string;
}): Promise<TicketDTO> {
  const { id, ...body } = input;
  return client.request(`/admin/tickets/${id}/external-protocol`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
