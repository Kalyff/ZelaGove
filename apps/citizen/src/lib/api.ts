import type { AgencyKind, TicketCategory, TicketStatus } from '@zeladoria/shared';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api/v1';

/**
 * Órgão externo, só com os campos públicos.
 *
 * Telefone e site NÃO são detalhe: são o que separa um encaminhamento de um
 * beco sem saída. Sem eles o cidadão sabe que o chamado saiu da prefeitura e
 * não sabe onde cobrar.
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
  /** Órgão responsável hoje. Nulo enquanto o chamado for municipal. */
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
  /** Para onde ESTE encaminhamento foi. Nulo nos demais eventos. */
  agency: AgencyDTO | null;
  externalProtocol: string | null;
  createdAt: string;
}

export interface TicketDetailDTO extends TicketDTO {
  timeline: TimelineEventDTO[];
}

/**
 * Chamado de OUTRA pessoa, na lista "Na cidade".
 *
 * Deliberadamente magro: sem título, descrição, foto ou qualquer traço de quem
 * abriu. Não é a `TicketDTO` com campos opcionais — é outro tipo, para que
 * nenhum componente escreva `ticket.description` achando que existe.
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

export class ApiError extends Error {
  constructor(public readonly code: string, message: string, public readonly field?: string) {
    super(message);
  }
}

// Token só em memória: nada de localStorage, que é legível por qualquer
// script injetado na página. O refresh vive em cookie httpOnly.
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

  // Access token curto: uma tentativa silenciosa de refresh evita derrubar o
  // usuário no meio de um formulário preenchido.
  if (res.status === 401 && retry && path !== '/auth/refresh') {
    const refreshed = await refresh().catch(() => null);
    if (refreshed) return request(path, init, false);
  }

  return parse(res);
}

export async function login(email: string, password: string) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
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

export function listMyTickets(): Promise<{ data: TicketDTO[]; total: number }> {
  return request('/tickets');
}

export function getTicket(id: string): Promise<TicketDetailDTO> {
  return request(`/tickets/${id}`);
}

/** Chamados de todos os cidadãos, em projeção reduzida. Exige estar logado. */
export function listPublicTickets(): Promise<{ data: PublicTicketDTO[]; total: number }> {
  return request('/tickets/public');
}

export function createTicket(form: FormData): Promise<TicketDTO> {
  return request('/tickets', { method: 'POST', body: form });
}
