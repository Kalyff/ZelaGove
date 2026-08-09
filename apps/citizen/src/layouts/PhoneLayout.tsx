import { AnimatePresence, m } from 'framer-motion';
import { DUR, EASE, SkipLink } from '@zeladoria/ui';
import { useRef } from 'react';
import { Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { BottomNav } from '../components/BottomNav';
import { GovStripe, PhoneFrame } from '../components/PhoneFrame';
import { useRouteFocus } from '@zeladoria/ui';

/**
 * Profundidade de cada rota, para a transição saber a direção.
 * Avançar entra pela direita; voltar, pela esquerda.
 */
const DEPTH: Record<string, number> = {
  '/entrar': 1,
  '/chamados': 1,
  /* Irmã de `/chamados`, não filha: as duas são destinos da barra inferior.
     Sem esta linha ela cairia na regra genérica abaixo e viraria profundidade 2,
     fazendo a troca entre abas animar como se estivesse entrando e saindo de um
     detalhe. */
  '/chamados/na-cidade': 1,
  '/chamados/novo': 2,
};

function depthOf(pathname: string): number {
  if (DEPTH[pathname] !== undefined) return DEPTH[pathname];
  // `/chamados/:id` — qualquer coisa sob /chamados que não seja a lista.
  if (pathname.startsWith('/chamados/')) return 2;
  return 0;
}

export function PhoneLayout({ withNav = false }: { withNav?: boolean }) {
  const location = useLocation();
  const navType = useNavigationType();
  const mainRef = useRef<HTMLElement>(null);
  const previousDepth = useRef(depthOf(location.pathname));

  const depth = depthOf(location.pathname);
  /* POP é o botão voltar do navegador — sempre trata como retorno, mesmo
     quando a profundidade não muda (troca entre irmãos). */
  const back = navType === 'POP' || depth < previousDepth.current;
  previousDepth.current = depth;

  useRouteFocus(mainRef, location.pathname);

  return (
    <PhoneFrame>
      <SkipLink />
      <GovStripe />

      {/* `tabIndex={-1}` existe para o useRouteFocus poder focar aqui na troca
          de rota. Não entra na ordem de Tab. */}
      <main
        id="conteudo"
        ref={mainRef}
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col focus:outline-none"
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={location.pathname}
            /* Só `x` — a opacidade fica em 1. Se o rAF não rodar (aba oculta,
               JS lento em 3G), o conteúdo aparece deslocado, não invisível.
               Ver a regra de robustez em packages/ui/src/lib/motion.ts. */
            initial={{ x: back ? -24 : 24 }}
            animate={{ x: 0, transition: { duration: DUR.page, ease: EASE.out } }}
            exit={{ x: back ? 16 : -16, transition: { duration: DUR.fast, ease: EASE.in } }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <Outlet />
          </m.div>
        </AnimatePresence>
      </main>

      {withNav && <BottomNav />}
    </PhoneFrame>
  );
}
