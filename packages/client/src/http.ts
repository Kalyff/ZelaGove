import type { ApiUser } from '@zeladoria/shared';

/**
 * Erro do servidor já desempacotado do envelope `{ error: { code, message,
 * field? } }`.
 *
 * `field` é o que permite a tela mostrar a mensagem NO campo errado em vez de
 * um aviso genérico no topo que não diz qual dos dois está com problema. O
 * servidor manda desde sempre; cabe ao cliente ler.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClient {
  /** Requisição autenticada crua. É sobre ela que cada app monta suas rotas. */
  request<T = unknown>(path: string, init?: RequestInit): Promise<T>;
  login(email: string, password: string): Promise<ApiUser>;
  /** Cria a conta e JÁ deixa a sessão aberta — o servidor devolve o mesmo par
   *  de tokens do login. */
  register(name: string, email: string, password: string): Promise<ApiUser>;
  refresh(): Promise<ApiUser>;
  logout(): Promise<void>;
}

async function parse(res: Response) {
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error;
    throw new ApiError(
      err?.code ?? 'UNKNOWN',
      err?.message ?? 'Não foi possível concluir a ação. Tente novamente.',
      err?.field,
    );
  }
  return body;
}

/**
 * Transporte HTTP dos dois front-ends.
 *
 * Era o mesmo código escrito duas vezes, um em cada `lib/api.ts`: uma correção
 * no retry de refresh precisava ser feita nos dois lugares, e bastava esquecer
 * um para o app do cidadão e o painel se comportarem diferente diante de uma
 * sessão expirada.
 *
 * O token de acesso vive no FECHAMENTO desta função, nunca em `localStorage` —
 * que é legível por qualquer script injetado na página. O refresh mora num
 * cookie `httpOnly`, e é por isso que toda requisição vai com
 * `credentials: 'include'`.
 */
export function createApiClient(baseUrl: string): ApiClient {
  let accessToken: string | null = null;

  async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const headers = new Headers(init.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    // FormData monta o próprio `Content-Type` com o boundary; fixá-lo aqui
    // produziria um corpo multipart que o servidor não consegue separar.
    if (init.body && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${baseUrl}${path}`, { ...init, headers, credentials: 'include' });

    // Access token curto: uma tentativa silenciosa de refresh evita derrubar o
    // usuário no meio de um formulário preenchido. Uma só — `retry: false` na
    // repetição fecha o laço, e `/auth/refresh` nunca tenta renovar a si mesmo.
    if (res.status === 401 && retry && path !== '/auth/refresh') {
      const refreshed = await refresh().catch(() => null);
      if (refreshed) return request<T>(path, init, false);
    }

    return parse(res) as Promise<T>;
  }

  async function login(email: string, password: string): Promise<ApiUser> {
    const data = await request<{ accessToken: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    accessToken = data.accessToken;
    return data.user;
  }

  /**
   * Só o app do cidadão tem tela para isto, mas o método é do cliente e não da
   * tela: quem guarda o access token é este fechamento, e devolver o token para
   * a página gravá-lo por fora seria justamente o que a decisão de manter o
   * token fora do `localStorage` existe para evitar.
   */
  async function register(name: string, email: string, password: string): Promise<ApiUser> {
    const data = await request<{ accessToken: string; user: ApiUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    accessToken = data.accessToken;
    return data.user;
  }

  async function refresh(): Promise<ApiUser> {
    const data = await request<{ accessToken: string; user: ApiUser }>(
      '/auth/refresh',
      { method: 'POST' },
      false,
    );
    accessToken = data.accessToken;
    return data.user;
  }

  async function logout(): Promise<void> {
    // Falha de rede aqui não pode prender o usuário numa sessão que ele pediu
    // para encerrar: o token local sai de qualquer jeito.
    await request('/auth/logout', { method: 'POST' }, false).catch(() => null);
    accessToken = null;
  }

  return { request, login, register, refresh, logout };
}
