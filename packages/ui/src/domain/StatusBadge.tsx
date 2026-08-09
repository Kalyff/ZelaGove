import type { TicketStatus } from '@zeladoria/shared';
import { cn } from '../lib/cn';
import { IconCheck, IconClock, IconExternal, IconTruck } from '../icons';
import { Badge } from '../primitives/Surfaces';
import { STATUS_CHIP } from './statusTokens';

const ICONS: Record<TicketStatus, typeof IconClock> = {
  pending: IconClock,
  in_progress: IconTruck,
  done: IconCheck,
  forwarded: IconExternal,
};

export interface StatusBadgeProps {
  status: TicketStatus;
  /**
   * O RÓTULO VEM DE FORA — do `statusLabel` que o servidor devolve, já
   * resolvido para o público certo. É por isso que `in_progress` lê
   * "Em Deslocamento" para o cidadão e "Em Andamento" para o servidor.
   * A cor sai do enum; o texto, nunca.
   */
  label: string;
  /** Sobre foto: adiciona elevação e anel para o chip não sumir na imagem. */
  onImage?: boolean;
  className?: string;
}

export function StatusBadge({ status, label, onImage = false, className }: StatusBadgeProps) {
  return (
    <Badge
      Icon={ICONS[status]}
      className={cn(STATUS_CHIP[status], onImage && 'shadow-panel ring-1 ring-black/10', className)}
    >
      {label}
    </Badge>
  );
}
