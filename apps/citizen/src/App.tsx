import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@zeladoria/client';
import { AnnouncerProvider, ThemeProvider, ToastProvider } from '@zeladoria/ui';
import { LazyMotion, MotionConfig } from 'framer-motion';
import type { ReactElement } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { PhoneLayout } from './layouts/PhoneLayout';
import { client } from './lib/api';
import Gateway from './pages/Gateway';
import Home from './pages/Home';
import Login from './pages/Login';
import NearbyTickets from './pages/NearbyTickets';
import NewTicket from './pages/NewTicket';
import TicketDetail from './pages/TicketDetail';

/** Carregado sob demanda — ver apps/citizen/src/motion-features.ts. */
const loadMotionFeatures = () => import('./motion-features').then((mod) => mod.default);

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 15_000 } },
});

/**
 * Guarda de navegação, não controle de acesso: quem decide de verdade é o
 * servidor (requisito 4.7). Isto existe para não piscar tela vazia.
 *
 * Fica na layout route, ACIMA do AnimatePresence: se o redirecionamento
 * acontecesse numa folha, a saída animada poderia deixar um nó órfão na tela.
 */
function Protected({ children }: { children?: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface text-sm text-content-tertiary">
        Carregando...
      </div>
    );
  }
  if (!user) return <Navigate to="/entrar" replace />;
  return children ?? <Outlet />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/*
        `domAnimation` via import() dinâmico (ver motion-features.ts): cobre
        transform, opacidade e AnimatePresence, que é tudo que este app usa. O
        `domMax` adicionaria layout animation e drag — peso que só o painel
        precisa.

        `strict` faz qualquer import acidental de `motion.*` (em vez de `m.*`)
        lançar em desenvolvimento. Sem isso o bundle completo entra de carona.

        `reducedMotion="user"` é o par do guard de CSS que está no preset: o CSS
        cobre os `transition-*` do Tailwind, isto cobre o framer, que anima por
        style inline e não é alcançado por media query.
      */}
      <LazyMotion features={loadMotionFeatures} strict>
        <MotionConfig reducedMotion="user">
          {/* Fora do router: o tema não depende de rota. */}
          <ThemeProvider>
            <AnnouncerProvider>
              <ToastProvider>
                <BrowserRouter>
                  {/* O papel é do app, não do usuário: sessão de gestor aberta
                      aqui é recusada no login em vez de parecer válida até a
                      primeira requisição voltar 403. Quem decide de verdade
                      continua sendo o servidor (requisito 4.7). */}
                  <AuthProvider
                    client={client}
                    role="citizen"
                    wrongAppMessage="Esta conta é do Portal do Servidor."
                  >
                    <Routes>
                      {/* Capa institucional — fora da moldura. */}
                      <Route path="/" element={<Gateway />} />

                      {/* Sem barra inferior: login e fluxos de profundidade 2. */}
                      <Route element={<PhoneLayout />}>
                        <Route path="/entrar" element={<Login />} />
                      </Route>

                      <Route element={<Protected />}>
                        {/* Os dois destinos da barra inferior. A rota estática
                            `na-cidade` convive com `/chamados/:id` abaixo: o
                            React Router v6 classifica segmento fixo acima de
                            dinâmico, como `/chamados/novo` já provava. */}
                        <Route element={<PhoneLayout withNav />}>
                          <Route path="/chamados" element={<Home />} />
                          <Route path="/chamados/na-cidade" element={<NearbyTickets />} />
                        </Route>
                        <Route element={<PhoneLayout />}>
                          <Route path="/chamados/novo" element={<NewTicket />} />
                          <Route path="/chamados/:id" element={<TicketDetail />} />
                        </Route>
                      </Route>
                      {/* Requisito 4.7: rota inválida volta para a raiz. */}
                      <Route path="*" element={<Navigate to="/" replace />} />
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
