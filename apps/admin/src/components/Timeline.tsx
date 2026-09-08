import { timelineDate, type TimelineEventDTO } from '@zeladoria/shared';
import { STATUS_ICON, STATUS_TIMELINE_NODE } from '@zeladoria/ui';

/* Ícone e cor do nó vêm do design system: são os mesmos do app do cidadão. */

/** Histórico imutável do chamado (requisito 4.2). */
export function Timeline({ events }: { events: TimelineEventDTO[] }) {
  return (
    <ol className="relative space-y-5">
      <span
        className="absolute bottom-3 left-[15px] top-3 w-px bg-gradient-to-b from-line-strong to-transparent"
        aria-hidden
      />
      {events.map((event) => {
        const Icon = STATUS_ICON[event.status];
        return (
          <li key={event.id} className="relative flex gap-3.5">
            <span
              className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-surface-raised ${STATUS_TIMELINE_NODE[event.status]}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-display text-sm font-bold text-content">{event.statusLabel}</p>
                <time
                  className="font-mono text-xs text-content-tertiary"
                  dateTime={event.createdAt}
                >
                  {timelineDate(event.createdAt)}
                </time>
              </div>
              {event.note && (
                <p className="mt-1 text-sm leading-relaxed text-content-secondary">{event.note}</p>
              )}

              {/* Para onde ESTE encaminhamento foi. Um chamado devolvido e
                  reencaminhado mostra os dois órgãos, cada um no seu evento —
                  é exatamente por isso que o campo mora no evento e não no
                  chamado. */}
              {event.agency && (
                <div className="mt-2 rounded-field bg-surface-sunken px-3 py-2">
                  <p className="font-display text-[11px] font-bold uppercase tracking-[0.08em] text-content-tertiary">
                    Órgão responsável
                  </p>
                  <p className="text-sm font-medium text-content">{event.agency.name}</p>
                  {(event.agency.publicPhone || event.agency.publicUrl) && (
                    <p className="mt-0.5 break-words font-mono text-xs text-content-secondary">
                      {[event.agency.publicPhone, event.agency.publicUrl]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  )}
                  {event.externalProtocol && (
                    <p className="mt-1 text-xs text-content-secondary">
                      Protocolo do órgão:{' '}
                      <span className="font-mono font-medium text-content">
                        {event.externalProtocol}
                      </span>
                    </p>
                  )}
                </div>
              )}
              {event.photoUrl && (
                <img
                  src={event.photoUrl}
                  alt="Registro anexado a esta atualização"
                  loading="lazy"
                  className="mt-3 aspect-[16/10] w-full rounded-field border border-line bg-surface-sunken object-cover"
                />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
