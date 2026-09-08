import {
  IconButton,
  IconClose,
  IconDashboard,
  IconExit,
  IconExternal,
  IconKanban,
  IconMap,
  PrefeituraLogo,
  ThemeToggle,
  cn,
} from '@zeladoria/ui';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@zeladoria/client';

const ITEMS = [
  { to: '/painel/visao-geral', label: 'Visão geral', Icon: IconDashboard },
  { to: '/painel/mapa', label: 'Mapa de zonas', Icon: IconMap },
  { to: '/painel/ordens', label: 'Ordens de serviço', Icon: IconKanban },
  /* Destino próprio, e não uma aba dentro do quadro: encaminhado é terminal e
     acumula sem limite — ver o comentário em BOARD_STATUSES. */
  { to: '/painel/encaminhados', label: 'Encaminhados', Icon: IconExternal },
];

export function Sidebar({
  className,
  inSheet = false,
  onNavigate,
}: {
  className?: string;
  /** Dentro da gaveta ganha botão de fechar e largura própria. */
  inSheet?: boolean;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    /* No claro a sidebar é o azul institucional, mais escura que o conteúdo.
       No escuro ela precisa ficar mais escura AINDA que a superfície da página,
       senão a hierarquia figura/fundo se inverte e a navegação parece flutuar
       na frente do conteúdo. */
    <aside
      className={cn(
        'flex w-64 shrink-0 flex-col bg-gov-blue-900 text-chrome',
        'dark:border-r dark:border-line dark:bg-surface-sunken',
        inSheet && 'h-full w-full',
        className,
      )}
    >
      <div className="flex items-start justify-between px-6 py-7">
        <div className="flex items-center gap-3">
          {/* Pequeno: aqui ele identifica o município sem competir com a
              navegação, que é o que a pessoa veio usar. */}
          <PrefeituraLogo size={52} className="shrink-0" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gov-yellow-400">gov.br</p>
            <p className="mt-1 font-display text-xl font-extrabold">Zeladoria</p>
          </div>
        </div>
        {inSheet && (
          <IconButton label="Fechar menu" onChrome onClick={onNavigate}>
            <IconClose />
          </IconButton>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                /* `min-h-11` = 44px, o mínimo de alvo de toque — na gaveta
                   estes itens passam a ser tocados com o dedo. */
                'relative flex min-h-11 items-center gap-3 rounded-field px-3.5 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-on'
                  : 'text-chrome-secondary hover:bg-white/5 hover:text-chrome',
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Barra à esquerda: o estado ativo não pode ser só cor. */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -left-2 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-gov-yellow-400"
                  />
                )}
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Na gaveta, o seletor de tema vem para cá — no celular ele não cabe no
          cabeçalho sem truncar o título da tela. */}
      {inSheet && (
        <div className="mx-3 mb-2 border-t border-white/10 px-3.5 pt-4 sm:hidden">
          <p className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-chrome-tertiary">
            Tema
          </p>
          <ThemeToggle onChrome />
        </div>
      )}

      {/* Sair fica separado dos destinos de navegação: é uma ação, e uma que
          não deve ser clicada por engano ao procurar uma tela. */}
      <button
        type="button"
        onClick={async () => {
          onNavigate?.();
          await signOut();
          navigate('/entrar', { replace: true });
        }}
        className="m-3 flex min-h-11 items-center gap-3 rounded-field border-t border-white/10 px-3.5 py-2.5 text-sm font-medium text-chrome-secondary transition-colors hover:bg-white/5 hover:text-chrome"
      >
        <IconExit className="h-[18px] w-[18px]" />
        Sair
      </button>
    </aside>
  );
}
