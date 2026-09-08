/**
 * Plataforma de front-end compartilhada pelos dois apps: transporte HTTP e
 * sessão.
 *
 * Não é design system (isso é `@zeladoria/ui`) nem domínio (isso é
 * `@zeladoria/shared`). Existe porque o cliente HTTP e o provedor de sessão
 * eram idênticos nos dois apps, palavra por palavra, e nada os mantinha assim.
 *
 * Nenhuma rota mora aqui: cada app declara as suas em `src/lib/api.ts`, sobre
 * o `request` deste pacote.
 */
export { ApiError, createApiClient } from './http';
export type { ApiClient } from './http';
export { AuthProvider, useAuth } from './auth';
export type { AuthState } from './auth';
