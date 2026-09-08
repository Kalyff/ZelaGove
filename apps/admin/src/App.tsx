import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@zeladoria/client';
import { AnnouncerProvider, ThemeProvider, ToastProvider } from '@zeladoria/ui';
import { LazyMotion, MotionConfig } from 'framer-motion';
import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { client } from './lib/api';
import Forwarded from './pages/Forwarded';
import Login from './pages/Login';
import MapZones from './pages/MapZones';
import Overview from './pages/Overview';
import Shell from './pages/Shell';
import WorkOrders from './pages/WorkOrders';

/** Carregado sob demanda — ver apps/admin/src/motion-features.ts. */
const loadMotionFeatures = () => import('./motion-features').then((mod) => mod.default);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 10_000 } },
});

function Protected({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-content-tertiary">Carregando...</div>;
  }
  return user ? children : <Navigate to="/entrar" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Fora do router: o tema não depende de rota e trocá-lo não deve
          participar do ciclo de navegação. */}
      {/*
        `domMax`, e não `domAnimation` como no app do cidadão: o Kanban precisa
        de layout animation (`layoutId`) para o card voar de uma coluna para a
        outra no update otimista. São ~6 kB gzip a mais, aceitáveis num
        back-office de desktop e não num PWA municipal em 3G.

        `strict` faz qualquer import acidental de `motion.*` lançar em dev.
        `reducedMotion="user"` é o par do guard de CSS que vive no preset.
      */}
      <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <AnnouncerProvider>
        <ToastProvider>
        <BrowserRouter>
          {/* Requisito 2.2: gestor não acessa o app do cidadão e vice-versa. */}
          <AuthProvider client={client} role="admin" wrongAppMessage="Acesso negado.">
            <Routes>
              <Route path="/entrar" element={<Login />} />
              <Route path="/painel" element={<Protected><Shell /></Protected>}>
                <Route index element={<Navigate to="/painel/visao-geral" replace />} />
                <Route path="visao-geral" element={<Overview />} />
                <Route path="mapa" element={<MapZones />} />
                <Route path="ordens" element={<WorkOrders />} />
                <Route path="encaminhados" element={<Forwarded />} />
              </Route>
              <Route path="*" element={<Navigate to="/painel/visao-geral" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
        </ToastProvider>
        </AnnouncerProvider>
      </ThemeProvider>
      </MotionConfig>
      </LazyMotion>
    </QueryClientProvider>
  );
}
