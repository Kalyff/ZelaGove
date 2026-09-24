import { m } from 'framer-motion';
import { DUR, EASE, SkipLink } from '@zeladoria/ui';
import { useEffect, useRef } from 'react';
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

  /* A primeira página aparece parada: nada chegou "de algum lugar", e com o
     `LazyMotion` ainda carregando ela ficaria deslocada até as features
     chegarem. */
  const firstPaint = useRef(true);

  const depth = depthOf(location.pathname);
  /* POP é o botão voltar do navegador — sempre trata como retorno, mesmo
     quando a profundidade não muda (troca entre irmãos). */
  const back = navType === 'POP' || depth < previousDepth.current;

  /* Atualizado em efeito, não no render: o `StrictMode` renderiza duas vezes,
     e a segunda já via a profundidade nova — o "Voltar" deslizava como avanço. */
  useEffect(() => {
    previousDepth.current = depth;
    firstPaint.current = false;
  }, [depth]);

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
        {/*
          Só ENTRADA, sem AnimatePresence — o mesmo padrão do Shell do painel.

          A versão anterior tinha `AnimatePresence mode="wait"` com saída. O nó
          que saía continuava com o `<Outlet />`, e o Outlet lê o contexto de
          rota: já renderizava a página NOVA. Cada clique mostrava a página nova,
          fazia ela sumir deslizando, e só então a montava de novo entrando —
          duas montagens, lista escalonada duas vezes, ~400ms de espera com
          cara de travamento.

          Só `x`, opacidade em 1: se o rAF não rodar, o conteúdo aparece
          deslocado, não invisível (regra em packages/ui/src/lib/motion.ts).
        */}
        <m.div
          key={location.pathname}
          initial={firstPaint.current ? false : { x: back ? -24 : 24 }}
          animate={{ x: 0 }}
          transition={{ duration: DUR.page, ease: EASE.out }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <Outlet />
        </m.div>
      </main>

      {withNav && <BottomNav />}
    </PhoneFrame>
  );
}
