import {
  CATEGORY_LABELS,
  PUBLIC_FEED_SORTS,
  PUBLIC_FEED_STATUSES,
  STATUS_LABELS_CITIZEN,
  TICKET_CATEGORIES,
  type PublicFeedStatus,
  type TicketCategory,
} from '@zeladoria/shared';
import { IconChevronDown, IconSearch, Input, cn } from '@zeladoria/ui';
import type { ReactNode } from 'react';

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

/**
 * Busca e filtros da lista "Na cidade".
 *
 * Os filtros são `<select>` nativos com cara de pílula: no celular abrem o
 * seletor do sistema, e teclado e leitor de tela vêm de graça. Fonte de 16px
 * mesmo na pílula — menor que isso, o iOS dá zoom ao focar e não volta.
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

      {/* Rola na horizontal em vez de quebrar linha: três pílulas em duas
          linhas comeriam a altura que a lista precisa. `-mx-6 px-6` deixa a
          rolagem chegar à borda da tela. */}
      <div className="-mx-6 mt-2.5 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none]">
        <PillSelect
          label="Filtrar por status"
          value={status ?? ''}
          active={status !== null}
          onChange={(v) => onStatusChange(v ? (v as PublicFeedStatus) : null)}
        >
          <option value="">Todos os status</option>
          {PUBLIC_FEED_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS_CITIZEN[s]}
            </option>
          ))}
        </PillSelect>

        <PillSelect
          label="Filtrar por categoria"
          value={category ?? ''}
          active={category !== null}
          onChange={(v) => onCategoryChange(v ? (v as TicketCategory) : null)}
        >
          <option value="">Todas as categorias</option>
          {TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </PillSelect>

        <PillSelect
          label="Ordenar"
          value={order}
          active={order !== 'recent'}
          onChange={(v) => onOrderChange(v as FeedOrder)}
        >
          {FEED_ORDERS.map((o) => (
            <option key={o} value={o}>
              {ORDER_LABELS[o]}
            </option>
          ))}
        </PillSelect>
      </div>
    </div>
  );
}

function PillSelect({
  label,
  value,
  active,
  onChange,
  children,
}: {
  label: string;
  value: string;
  /** Fora do padrão: destacada, para o filtro aplicado se ver de relance. */
  active: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-11 cursor-pointer appearance-none rounded-full border pl-4 pr-9 text-base font-medium transition-colors',
          active
            ? 'border-accent bg-accent-soft text-accent-onSoft'
            : 'border-line-strong bg-surface text-content',
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
