import type { TicketStatus } from '@zeladoria/shared';
import { IconCheck, IconClock, IconExternal, IconTruck } from '@zeladoria/ui';
import { m } from 'framer-motion';
import type { TimelineEventDTO } from '../lib/api';
import { timelineDate } from '../lib/format';

/**
 * Ícone por status. Antes só distinguia `done` de "todo o resto", então um
 * evento pendente e um em deslocamento apareciam idênticos — dois relógios
 * cinzas — enquanto o chip de status ao lado os mostrava em cores diferentes.
 */
const ICONS: Record<TicketStatus, typeof IconClock> = {
  pending: IconClock,
  in_progress: IconTruck,
  done: IconCheck,
  forwarded: IconExternal,
};

const NODE: Record<TicketStatus, string> = {
  pending: 'bg-warn-soft text-warn-onSoft',
  in_progress: 'bg-accent-soft text-accent-onSoft',
  done: 'bg-success text-success-on',
  forwarded: 'bg-ink-100 text-ink-700 dark:bg-surface-sunken dark:text-content-secondary',
};

/**
 * Requisito 4.2 e 3.1.5: o histórico completo, inclusive notas e fotos escritas
 * pelo gestor. Ordem cronológica inversa — o servidor já entrega assim.
 */
export function Timeline({ events }: { events: TimelineEventDTO[] }) {
  return (
    <ol className="relative space-y-6">
      {/* Fio vertical: some ao chegar no evento de abertura, sinalizando o
          começo da história em vez de cortar reto. Anima em `scaleY` (transform,
          sem reflow), nunca em `height`. */}
      <m.span
        aria-hidden
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: 'top' }}
        className="absolute bottom-3 left-[15px] top-3 w-px bg-gradient-to-b from-line-strong to-transparent"
      />
      {events.map((event, i) => {
        const Icon = ICONS[event.status];
        return (
          <m.li
            key={event.id}
            className="relative flex gap-4"
            /* Só `y` — o histórico do chamado não pode depender do rAF para
               ser legível. Ver a regra em packages/ui/src/lib/motion.ts. */
            initial={{ y: 8 }}
            animate={{ y: 0 }}
            transition={{ delay: Math.min(i, 6) * 0.05, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-surface ${NODE[event.status]}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                {/* Rótulo do servidor: "Em Deslocamento" para o cidadão. */}
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

              {/* Cada encaminhamento carrega o SEU órgão. Um chamado que foi à
                  concessionária, voltou e seguiu ao saneamento mostra os dois
                  aqui, na ordem — o cidadão consegue reconstruir o caminho. */}
              {event.agency && (
                <div className="mt-2 rounded-field border border-line bg-surface-sunken px-3 py-2">
                  <p className="text-sm font-semibold text-content">{event.agency.name}</p>
                  {event.externalProtocol && (
                    <p className="mt-0.5 text-xs text-content-secondary">
                      Protocolo no órgão:{' '}
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
          </m.li>
        );
      })}
    </ol>
  );
}
