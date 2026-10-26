import {
  CATEGORY_LABELS,
  PUBLIC_FEED_SORTS,
  PUBLIC_FEED_STATUSES,
  STATUS_LABELS_CITIZEN,
  TICKET_CATEGORIES,
  type PublicFeedStatus,
  type TicketCategory,
} from '@zeladoria/shared';
import { Field, IconChevronDown, IconSearch, Input, Select, cn } from '@zeladoria/ui';
import { useId, useState, type ReactNode } from 'react';

/**
 * As ordens da lista "Na cidade": as do servidor e "Mais próximos", que roda
 * no aparelho porque precisa da posição de quem vê.
 */
export const FEED_ORDERS = [...PUBLIC_FEED_SORTS, 'nearest'] as const;
export type FeedOrder = (typeof FEED_ORDERS)[number];

const ORDER_LABELS: Record<FeedOrder, string> = {
  recent: 'Mais recentes',
  oldest: 'Mais antigos',
  supports: 'Mais apoiados',
  nearest: 'Mais próximos',
};

const PILL = 'h-11 rounded-full border text-base font-medium transition-colors';
const PILL_IDLE = 'border-line-strong bg-surface text-content';
/* Fora do padrão: destacado, para o filtro aplicado se ver de relance. */
const PILL_ACTIVE = 'border-accent bg-accent-soft text-accent-onSoft';

/**
 * Busca, filtros e ordem da lista "Na cidade".
 *
 * Status e categoria ficam atrás do botão "Filtros", e só a ordem fica à
 * vista. As três pílulas lado a lado não cabiam: rolavam na horizontal, e no
 * computador — sem barra nem gesto de arrastar — pareciam simplesmente
 * cortadas. Dentro do painel cada `<select>` tem a largura toda e um rótulo
 * visível, então nenhuma opção ("Em Deslocamento") é truncada.
 *
 * Fonte de 16px nos `<select>` — menor que isso, o iOS dá zoom ao focar e não
 * volta.
 */
export function FeedFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  order,
  onOrderChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  status: PublicFeedStatus | null;
  onStatusChange: (value: PublicFeedStatus | null) => void;
  category: TicketCategory | null;
  onCategoryChange: (value: TicketCategory | null) => void;
  order: FeedOrder;
  onOrderChange: (value: FeedOrder) => void;
}) {
  const panelId = useId();
  const activeFilters = (status ? 1 : 0) + (category ? 1 : 0);
  /* Volta do detalhe com filtro aplicado: o painel já abre mostrando qual. */
  const [open, setOpen] = useState(activeFilters > 0);

  return (
    <div className="mt-4">
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
        <Input
          type="search"
          enterKeyHint="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por protocolo ou título"
          aria-label="Buscar chamados na cidade"
          className="pl-10"
        />
      </div>

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            PILL,
            'flex shrink-0 items-center gap-2 px-4',
            activeFilters > 0 ? PILL_ACTIVE : PILL_IDLE,
          )}
        >
          Filtros
          {activeFilters > 0 && (
            <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-on">
              {activeFilters}
              <span className="sr-only">{activeFilters === 1 ? ' ativo' : ' ativos'}</span>
            </span>
          )}
        </button>

        {/* Ocupa o resto da linha: com o botão ao lado, "Mais recentes" cabe
            inteiro até em tela de 360px. */}
        <PillSelect
          label="Ordenar"
          value={order}
          active={order !== 'recent'}
          onChange={(v) => onOrderChange(v as FeedOrder)}
          className="min-w-0 flex-1"
        >
          {FEED_ORDERS.map((o) => (
            <option key={o} value={o}>
              {ORDER_LABELS[o]}
            </option>
          ))}
        </PillSelect>
      </div>

      {open && (
        <div id={panelId} className="mt-3 space-y-3">
          <Field label="Status">
            {(p) => (
              <Select
                {...p}
                value={status ?? ''}
                onChange={(e) =>
                  onStatusChange(e.target.value ? (e.target.value as PublicFeedStatus) : null)
                }
              >
                <option value="">Todos</option>
                {PUBLIC_FEED_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS_CITIZEN[s]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Categoria">
            {(p) => (
              <Select
                {...p}
                value={category ?? ''}
                onChange={(e) =>
                  onCategoryChange(e.target.value ? (e.target.value as TicketCategory) : null)
                }
              >
                <option value="">Todas</option>
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      )}
    </div>
  );
}

function PillSelect({
  label,
  value,
  active,
  onChange,
  className,
  children,
}: {
  label: string;
  value: string;
  active: boolean;
  onChange: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('relative', className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          PILL,
          'w-full cursor-pointer appearance-none pl-4 pr-9',
          active ? PILL_ACTIVE : PILL_IDLE,
        )}
      >
        {children}
      </select>
      <IconChevronDown
        className={cn(
          'pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2',
          active ? 'text-accent-onSoft' : 'text-content-tertiary',
        )}
      />
    </label>
  );
}
