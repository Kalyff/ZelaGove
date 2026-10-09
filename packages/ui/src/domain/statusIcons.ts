import type { TicketStatus, TimelineEventDTO } from '@zeladoria/shared';
import { IconCheck, IconClock, IconExternal, IconNote, IconTruck } from '../icons';
import { STATUS_TIMELINE_NODE } from './statusTokens';

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

/**
 * Ícone, cor do nó e título de UM evento da linha do tempo.
 *
 * A observação do gestor carrega o status vigente, mas não é transição: com o
 * visual do status, o cidadão leria "Em Deslocamento" duas vezes e acharia que
 * algo mudou. Fica aqui, e não em cada timeline, pelo mesmo motivo do
 * `STATUS_ICON` — as duas pontas têm de mostrar o mesmo histórico.
 */
export function timelineEventVisual(event: Pick<TimelineEventDTO, 'kind' | 'status' | 'statusLabel'>) {
  if (event.kind === 'note') {
    return {
      Icon: IconNote,
      node: 'bg-surface-sunken text-content-secondary',
      title: 'Observação',
    };
  }
  return {
    Icon: STATUS_ICON[event.status],
    node: STATUS_TIMELINE_NODE[event.status],
    title: event.statusLabel,
  };
}
