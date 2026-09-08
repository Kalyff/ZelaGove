import type { TicketStatus } from '@zeladoria/shared';
import { IconCheck, IconClock, IconExternal, IconTruck } from '../icons';

/**
 * Ícone por status, único em toda a plataforma.
 *
 * Estava escrito três vezes — no `StatusBadge` e nas duas linhas do tempo. A
 * consequência de manter cópias já apareceu uma vez: as timelines distinguiam
 * só `done` de "todo o resto", então um evento pendente e um em deslocamento
 * apareciam idênticos (dois relógios) enquanto o chip de status ao lado os
 * mostrava em cores diferentes.
 */
export const STATUS_ICON: Record<TicketStatus, typeof IconClock> = {
  pending: IconClock,
  in_progress: IconTruck,
  done: IconCheck,
  forwarded: IconExternal,
};
