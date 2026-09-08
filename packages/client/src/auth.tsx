import type { ApiUser, UserRole } from '@zeladoria/shared';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, type ApiClient } from './http';

export interface AuthState {
  user: ApiUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Sessão dos dois front-ends.
 *
 * Os dois apps tinham o mesmo provedor escrito por inteiro; a única diferença
 * entre eles era o papel aceito e o texto do erro — que agora são props.
 *
 * O papel importa aqui por um motivo de produto, não de segurança: quem decide
 * de verdade é o servidor (requisito 4.7, `requireRole`). Isto impede que uma
 * sessão de gestor aberta no app do cidadão fique parecendo válida até a
 * primeira requisição voltar 403.
 */
export function AuthProvider({
  client,
  role,
  wrongAppMessage,
  children,
}: {
  client: ApiClient;
  /** Papel que ESTE app aceita. Sessão de outro papel é recusada no login. */
  role: UserRole;
  /** O que o usuário lê ao entrar com a conta do outro app. */
  wrongAppMessage: string;
  children: ReactNode;
}) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao abrir o app, tenta restaurar a sessão pelo cookie de refresh.
  useEffect(() => {
    client
      .refresh()
      .then((u) => setUser(u.role === role ? u : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [client, role]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        const u = await client.login(email, password);
        if (u.role !== role) {
          // Sessão do app errado não fica pendurada: o cookie de refresh sai
          // junto, senão o próximo carregamento a restauraria em silêncio.
          await client.logout();
          throw new ApiError('WRONG_APP', wrongAppMessage);
        }
        setUser(u);
      },
      async signOut() {
        await client.logout();
        setUser(null);
      },
    }),
    [client, role, wrongAppMessage, user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
