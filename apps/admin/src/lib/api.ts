import type { AgencyKind, TicketCategory, TicketStatus } from '@zeladoria/shared';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api/v1';

/**
 * Só os campos públicos do órgão — é tudo o que a API devolve, de propósito
 * (ver `toAgencyDTO` no servidor). O painel não tem "mais" que o cidadão aqui.
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
  role: 'citizen' | 'admin';
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
  /** Órgão CORRENTE — cache do último encaminhamento. O histórico está na
   *  linha do tempo, e é lá que se vê para onde foi cada um. */
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

export interface TicketDetailDTO extends TicketDTO {
  citizen: { id: string; name: string; email: string };
  timeline: TimelineEventDTO[];
}

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
  /** Mapa completo por status: soma igual a `total` mesmo quando entrar um
   *  status novo, sem depender de a rota lembrar de expor cada um. */
  byStatus: Record<TicketStatus, number>;
  recent: TicketDTO[];
}

export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly field?: string) {
    super(message);
  }
}

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

async function parse(res: Response) {
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Não foi possível concluir a ação. Tente novamente.',
      err?.field
    );
  }
  return body;
}

async function request(path: string, init: RequestInit = {}, retry = true): Promise<any> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${BASE}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && retry && path !== '/auth/refresh') {
    const refreshed = await refresh().catch(() => null);
    if (refreshed) return request(path, init, false);
  }
  return parse(res);
}

export async function login(email: string, password: string) {
  const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  setAccessToken(data.accessToken);
  return data.user as ApiUser;
}

export async function refresh() {
  const data = await request('/auth/refresh', { method: 'POST' }, false);
  setAccessToken(data.accessToken);
  return data.user as ApiUser;
}

export async function logout() {
  await request('/auth/logout', { method: 'POST' }, false).catch(() => null);
  setAccessToken(null);
}

export interface TicketPageDTO {
  data: TicketDTO[];
  total: number;
  page: number;
  perPage: number;
}

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
  return request(`/admin/tickets?${qs}`);
}

export function listAgencies(): Promise<{ data: AgencyDTO[] }> {
  return request('/admin/agencies');
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
  return request(`/admin/tickets/${id}/forward`, { method: 'POST', body: JSON.stringify(body) });
}

/** Anota o protocolo devolvido pelo órgão — quase sempre dias depois. */
export function appendExternalProtocol(input: {
  id: string;
  externalProtocol: string;
  note?: string;
}): Promise<TicketDTO> {
  const { id, ...body } = input;
  return request(`/admin/tickets/${id}/external-protocol`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getTicket(id: string): Promise<TicketDetailDTO> {
  return request(`/admin/tickets/${id}`);
}

export function listMapPoints(): Promise<{ data: MapPointDTO[] }> {
  return request('/admin/tickets/map');
}

export function getMetrics(): Promise<MetricsDTO> {
  return request('/admin/metrics');
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
  return request(`/admin/tickets/${input.id}/status`, { method: 'PATCH', body: form });
}
