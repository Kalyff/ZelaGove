import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as api from './api';

interface AuthState {
  user: api.ApiUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .refresh()
      .then((u) => setUser(u.role === 'admin' ? u : null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      async signIn(email, password) {
        const u = await api.login(email, password);
        // Requisito 2.2: gestor não acessa o app do cidadão e vice-versa.
        if (u.role !== 'admin') {
          await api.logout();
          throw new api.ApiError('WRONG_APP', 'Acesso negado.');
        }
        setUser(u);
      },
      async signOut() {
        await api.logout();
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}
