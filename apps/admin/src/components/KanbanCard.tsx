import { useDraggable } from '@dnd-kit/core';
import {
  BOARD_STATUSES,
  STATUS_LABELS_ADMIN,
  dateTime,
  type TicketDTO,
  type TicketStatus,
} from '@zeladoria/shared';
import { IconExternal, IconGrip, STATUS_HEX, STATUS_HEX_DARK, cn, useTheme } from '@zeladoria/ui';
import { m } from 'framer-motion';

export function KanbanCard({
  ticket,
  onOpen,
  onStatusChange,
  onForward,
  /** Renderizado dentro do DragOverlay: card "levantado" que segue o cursor. */
  isOverlay = false,
}: {
  ticket: TicketDTO;
  onOpen?: () => void;
  onStatusChange?: (status: TicketStatus) => void;
  onForward?: () => void;
  isOverlay?: boolean;
}) {
  const { theme } = useTheme();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: ticket.id,
    disabled: isOverlay,
  });

  const accent = (theme === 'dark' ? STATUS_HEX_DARK : STATUS_HEX)[ticket.status];

  return (
    <m.article
      ref={isOverlay ? undefined : setNodeRef}
      /* `layout` + `layoutId` fazem o card VOAR para a nova coluna quando o
         cache otimista o move, em vez de sumir de um lado e nascer no outro.
         Exige o feature set `domMax`, que este app carrega. */
      layout={!isOverlay}
      layoutId={isOverlay ? undefined : ticket.id}
      className={cn(
        'card group relative p-3.5',
        /* O card de origem some por completo e um placeholder tracejado guarda
           o lugar. Antes ele ficava em `opacity-40` e, sem z-index, o card
           arrastado deslizava POR BAIXO dos irmãos. */
        isDragging && 'opacity-0',
        isOverlay && 'rotate-2 scale-[1.03] cursor-grabbing shadow-lift',
      )}
    >
      {/* Faixa na cor do status: o `<select>` abaixo é neutro e não dizia, à
          distância, em que coluna o card está. */}
      <span
        aria-hidden
        className="absolute inset-y-3.5 left-0 w-[3px] rounded-r-full"
        style={{ backgroundColor: accent }}
      />

      <div className="flex items-start justify-between gap-2 pl-2">
        <span className="rounded-full bg-surface-sunken px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.08em] text-content-secondary">
          {ticket.categoryLabel}
        </span>
        {/* O grip é o único ponto de arrasto: assim o clique no corpo do card
            abre o detalhe sem competir com o drag.
            `opacity-60` e não `opacity-0`: escondido até o hover, ele era
            invisível — e portanto inexistente — em qualquer aparelho de toque.
            `touch-action: none` é exigência do dnd-kit para arrasto por toque. */}
        <button
          type="button"
          {...listeners}
          {...attributes}
          aria-label={`Arrastar ${ticket.title}`}
          title="Arrastar para outra coluna"
          style={{ touchAction: 'none' }}
          className="-m-2 cursor-grab p-2 text-content-decor opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
        >
          <IconGrip className="h-4 w-4" />
        </button>
      </div>

      <button
        type="button"
        onClick={onOpen}
        /* O `<img>` dentro do botão entra no nome acessível como ruído; o
           aria-label fixa o nome no título da ordem. */
        aria-label={`Abrir detalhes de ${ticket.title}`}
        className="mt-2 block w-full pl-2 text-left"
      >
        <p className="font-display text-sm font-bold leading-snug text-content">{ticket.title}</p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-content-secondary">
          {ticket.description}
        </p>
        {ticket.photoUrl && (
          <img
            src={ticket.photoUrl}
            alt=""
            loading="lazy"
            className="mt-2.5 h-24 w-full rounded-field bg-surface-sunken object-cover"
          />
        )}
        <p className="mt-2.5 font-mono text-[10px] text-content-tertiary">
          {dateTime(ticket.createdAt)}
        </p>
      </button>

      {/* Alternativa ao drag-and-drop: cumpre a mesma regra de negócio e é
          operável por teclado. Continua existindo mesmo com o KeyboardSensor —
          para quem usa teclado, escolher num select é mais rápido que arrastar. */}
      {!isOverlay && onStatusChange && (
        <div className="mt-3 flex items-center gap-2 border-t border-line pl-2 pt-2.5">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Alterar status de {ticket.title}</span>
            <select
              value={ticket.status}
              onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
              className="w-full cursor-pointer rounded-field border border-line bg-surface-sunken px-2 py-1.5 text-xs font-medium text-content-secondary"
            >
              {/* `BOARD_STATUSES`, não `TICKET_STATUSES`: oferecer "Encaminhado"
                  aqui produzia um 422 garantido — encaminhar exige órgão e
                  justificativa, e a rota de status recusa esse valor de
                  propósito. O botão ao lado é o caminho certo. */}
              {BOARD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS_ADMIN[status]}
                </option>
              ))}
            </select>
          </label>

          {onForward && (
            <button
              type="button"
              onClick={onForward}
              title="Encaminhar a outro órgão"
              aria-label={`Encaminhar ${ticket.title} a outro órgão`}
              className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-field border border-line bg-surface-sunken px-2 text-xs font-medium text-content-secondary transition-colors hover:border-line-strong hover:text-content"
            >
              <IconExternal className="h-3.5 w-3.5" />
              Encaminhar
            </button>
          )}
        </div>
      )}
    </m.article>
  );
}
