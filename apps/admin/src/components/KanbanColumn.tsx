import { useDroppable } from '@dnd-kit/core';
import type { TicketStatus } from '@zeladoria/shared';
import {
  IconAlert,
  IconCheck,
  IconClock,
  IconExternal,
  STATUS_HEX,
  STATUS_HEX_DARK,
  cn,
  useTheme,
} from '@zeladoria/ui';
import type { ReactNode } from 'react';

const ICONS: Record<TicketStatus, typeof IconClock> = {
  pending: IconAlert,
  in_progress: IconClock,
  done: IconCheck,
  forwarded: IconExternal,
};

export function KanbanColumn({
  status,
  label,
  count,
  children,
}: {
  status: TicketStatus;
  label: string;
  count: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { theme } = useTheme();
  const Icon = ICONS[status];
  const accent = (theme === 'dark' ? STATUS_HEX_DARK : STATUS_HEX)[status];

  return (
    /* `min-w-[86vw] snap-center` abaixo de `lg`: as três colunas viram um
       carrossel horizontal com encaixe, em vez de empilharem numa página de
       três telas de altura. Arrastar entre colunas num scroller assim é ruim
       mesmo — no celular o caminho é o `<select>` de cada card, e tudo bem. */
    <section className="flex min-w-[86vw] snap-center flex-col sm:min-w-[70vw] lg:min-w-0">
      <header className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4" style={{ color: accent }} />
        <h2 className="font-display text-sm font-extrabold uppercase tracking-[0.08em] text-content">
          {label}
        </h2>
        <span className="rounded-full bg-line px-2 py-0.5 font-mono text-[11px] tabular-nums text-content-secondary">
          {count}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          /* `overflow-y-auto min-h-0`: cada coluna rola por conta própria em
             telas grandes. Antes uma coluna cheia empurrava a página inteira e
             as outras duas ficavam fora de vista. */
          'flex-1 space-y-3 rounded-card border-2 border-dashed p-3 transition-colors duration-150 lg:min-h-0 lg:overflow-y-auto',
          /* Sem modificador de opacidade: as cores semânticas são `var(--…)`
             com hex dentro, e o Tailwind descarta `bg-accent-soft/60` em
             silêncio. As duas colunas ficavam SEM fundo nenhum — inclusive o
             realce do alvo de arrasto, que era só a borda. */
          isOver ? 'border-accent bg-accent-soft' : 'border-line bg-surface-sunken',
        )}
      >
        {children}
        {count === 0 && (
          <p className="py-8 text-center text-xs text-content-tertiary">
            Nenhuma ordem nesta coluna.
          </p>
        )}
      </div>
    </section>
  );
}
