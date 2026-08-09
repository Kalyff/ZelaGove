import { m } from 'framer-motion';
import { IconExit, IconList, IconPlus, SPRING } from '@zeladoria/ui';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';


/**
 * Barra inferior flutuante.
 *
 * O estado ativo agora vem do NavLink (roteador), não de uma prop passada à
 * mão — antes era possível a barra dizer que você está numa tela e o roteador
 * dizer outra.
 */
export function BottomNav() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <nav
      aria-label="Navegação principal"
      /* `pointer-events-none` no invólucro deixa tocar o conteúdo ao lado da
         pílula; a pílula reativa o ponteiro. O padding inferior soma a safe
         area, senão a barra encosta no indicador de gesto do iPhone. */
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-[calc(1rem+var(--safe-b))]"
    >
      <div className="pointer-events-auto flex items-end gap-2 rounded-full border border-white/40 bg-white/70 px-3 py-2 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-surface-raised/75">
        <NavItem to="/chamados" label="Chamados" Icon={IconList} />

        {/* FAB elevado acima da barra (requisito 3.1.3).
            O anel recorta o FAB da pílula de vidro, então acompanha a PÍLULA e
            não a página — por isso `ring-surface-raised` no escuro. */}
        <m.button
          type="button"
          onClick={() => navigate('/chamados/novo')}
          aria-label="Abrir novo chamado"
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          transition={SPRING.snap}
          className="-mt-8 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gov-green-600 text-white shadow-fab ring-4 ring-surface dark:bg-gov-green-500 dark:ring-surface-raised"
        >
          <IconPlus className="h-7 w-7" />
        </m.button>

        <button
          type="button"
          onClick={async () => {
            await signOut();
            navigate('/entrar', { replace: true });
          }}
          className="flex h-11 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl text-content-tertiary transition-colors hover:text-content"
        >
          <IconExit className="h-5 w-5" />
          <span className="font-display text-[10px] font-bold leading-none">Sair</span>
        </button>
      </div>
    </nav>
  );
}

/**
 * Item da barra com rótulo VISÍVEL.
 *
 * O `aria-label` sozinho resolve para leitor de tela, mas não para quem
 * simplesmente não reconhece o pictograma — e ícone de navegação sem texto é
 * uma das causas mais comuns de gente não achar a função.
 */
function NavItem({
  to,
  label,
  Icon,
}: {
  to: string;
  label: string;
  Icon: (p: { className?: string }) => JSX.Element;
}) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `relative flex h-11 w-16 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors ${
          isActive ? 'text-accent' : 'text-content-tertiary hover:text-content'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="h-5 w-5" />
          <span className="font-display text-[10px] font-bold leading-none">{label}</span>
          {/* Barra indicadora: o estado ativo não pode ser só cor.
              Sem `layoutId` — ele exigiria o feature set `domMax`, que este app
              não carrega, e com um único destino não haveria entre o que
              deslizar. */}
          {isActive && (
            <span className="absolute -bottom-0.5 h-[3px] w-6 rounded-full bg-accent" />
          )}
        </>
      )}
    </NavLink>
  );
}
