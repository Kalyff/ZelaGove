import { IconButton, IconMenu, SkipLink, ThemeToggle, useRouteFocus } from '@zeladoria/ui';
import { Sheet } from '@zeladoria/ui';
import { m } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../lib/auth';
import { initials } from '../lib/format';

const TITLES: Record<string, string> = {
  '/painel/visao-geral': 'Visão geral',
  '/painel/mapa': 'Mapa de zonas',
  '/painel/ordens': 'Ordens de serviço',
  '/painel/encaminhados': 'Encaminhados',
};

/**
 * Quais telas rolam e quais ocupam a altura exata.
 *
 * É isto que mata o `h-[calc(100vh-9.5rem)]` mágico que o mapa usava — aquele
 * número era a soma do header com os paddings, e quebrava sempre que qualquer
 * um dos dois mudasse.
 */
const SCROLLS: Record<string, boolean> = {
  '/painel/mapa': false,
};

export default function Shell() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useRouteFocus(mainRef, pathname);

  /* A gaveta fecha ao navegar. Sem isto ela fica aberta por cima da tela nova
     e o servidor precisa fechá-la à mão a cada clique. */
  useEffect(() => setNavOpen(false), [pathname]);

  const scrolls = SCROLLS[pathname] ?? true;

  return (
    /* `100dvh` e não `100vh`: no celular a barra do navegador entra e sai, e o
       `vh` fixo deixa o rodapé sob a interface do sistema. */
    <div className="flex h-[100dvh] overflow-hidden bg-surface-sunken">
      <SkipLink />

      {/* Abaixo de `lg` a sidebar sai do fluxo e vira gaveta. Antes era `w-64`
          sem nenhum breakpoint: em 375px ela comia 256px da tela e, com o
          `overflow-hidden` do shell, não havia como escapar. */}
      <Sidebar className="hidden lg:flex" />

      <Sheet open={navOpen} onClose={() => setNavOpen(false)} label="Navegação" id="menu-lateral">
        <Sidebar inSheet onNavigate={() => setNavOpen(false)} />
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 pt-[calc(0.75rem+var(--safe-t))] lg:px-8 lg:py-4">
          <div className="flex min-w-0 items-center gap-2">
            <IconButton
              label="Abrir menu"
              aria-expanded={navOpen}
              aria-controls="menu-lateral"
              onClick={() => setNavOpen(true)}
              className="lg:hidden"
            >
              <IconMenu />
            </IconButton>
            <h1 className="truncate font-display text-lg font-extrabold text-content lg:text-xl">
              {TITLES[pathname] ?? 'Painel'}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-3 lg:gap-4">
            {/* Abaixo de `sm` o seletor de tema sai do cabeçalho e vai para a
                gaveta: os três botões comiam ~100px e faziam "Ordens de
                serviço" truncar em "Ordens de ser...". Entre saber onde você
                está e trocar o tema, o título ganha. */}
            <ThemeToggle className="hidden sm:inline-flex" />
            {user && (
              <div className="flex items-center gap-3">
                {/* O nome some abaixo de `sm` — em tela estreita ele empurra o
                    título e o hambúrguer para fora. As iniciais bastam. */}
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-content">{user.name}</p>
                  <p className="text-xs text-content-tertiary">Servidor</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent font-display text-sm font-bold text-accent-on">
                  {initials(user.name)}
                </span>
              </div>
            )}
          </div>
        </header>

        <main
          id="conteudo"
          ref={mainRef}
          tabIndex={-1}
          className={`min-h-0 flex-1 p-4 focus:outline-none sm:p-6 lg:p-8 ${
            scrolls ? 'overflow-y-auto' : 'overflow-hidden'
          }`}
        >
          {/*
            Transição de rota SEM opacidade, e sem AnimatePresence.

            A versão anterior era um crossfade com `AnimatePresence mode="wait"`
            e `initial={{ opacity: 0 }}`. Ela deixava o conteúdo preso em
            opacidade 0 na maioria das navegações: com `mode="wait"` o novo
            filho só anima depois que a saída do anterior termina, e quando essa
            conclusão não chega o painel monta inteiro — dados carregados, mapa
            com tiles — e permanece invisível. A tela ficava branca até recarregar.

            É exatamente a regra registrada em packages/ui/src/lib/motion.ts:
            conteúdo não pode depender de animação para existir. Aqui a chave por
            `pathname` remonta o bloco a cada rota e ele desliza 6px; se a
            animação não rodar por qualquer motivo, o pior caso é o conteúdo
            aparecer 6px deslocado — nunca invisível.
          */}
          <m.div
            key={pathname}
            initial={{ y: 6 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="h-full"
          >
            <Outlet />
          </m.div>
        </main>
      </div>
    </div>
  );
}
