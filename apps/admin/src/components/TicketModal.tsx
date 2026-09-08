import { useQuery } from '@tanstack/react-query';
import {
  ErrorState,
  IconPin,
  IconUser,
  Modal,
  Skeleton,
  SkeletonText,
  StatusBadge,
} from '@zeladoria/ui';
import { coords, dateTime } from '@zeladoria/shared';
import { getTicket } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { Timeline } from './Timeline';

/** Requisito 3.2.6. */
export function TicketModal({
  ticketId,
  onClose,
}: {
  ticketId: string | null;
  onClose: () => void;
}) {
  const {
    data: ticket,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.ticketDetail(ticketId),
    queryFn: () => getTicket(ticketId as string),
    enabled: !!ticketId,
  });

  return (
    <Modal
      open={!!ticketId}
      onClose={onClose}
      title="Detalhes da ordem de serviço"
      eyebrow={ticket ? `Protocolo ${ticket.protocol}` : undefined}
      size="xl"
    >
      {isLoading && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]" aria-hidden>
          <div className="space-y-4">
            <Skeleton className="h-[26px] w-40 rounded-full" />
            <SkeletonText className="h-5 w-2/3" />
            <SkeletonText className="w-full" />
            <SkeletonText className="w-4/5" />
            <Skeleton className="aspect-[16/10] w-full rounded-field" />
          </div>
          <div className="space-y-3">
            <SkeletonText className="w-32" />
            <Skeleton className="h-20 w-full rounded-field" />
          </div>
        </div>
      )}

      {/* Antes não havia ramo de erro: uma falha no fetch deixava o modal
          permanentemente vazio, sem explicação e sem saída. */}
      {isError && (
        <ErrorState
          title="Não foi possível carregar a ordem"
          description="A requisição falhou. Tente novamente."
          onRetry={() => refetch()}
        />
      )}

      {ticket && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-surface-sunken px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-content-secondary">
                {ticket.categoryLabel}
              </span>
              <StatusBadge status={ticket.status} label={ticket.statusLabel} />
            </div>

            <div>
              {/* h2 (título do modal) -> h3. Antes a linha do tempo era um h4,
                  pulando um nível. */}
              <h3 className="font-display text-xl font-extrabold leading-snug text-content">
                {ticket.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-content-secondary">
                {ticket.description}
              </p>
              <p className="mt-2 text-xs text-content-tertiary">
                Aberto em {dateTime(ticket.createdAt)}
              </p>
            </div>

            {ticket.photoUrl && (
              <img
                src={ticket.photoUrl}
                alt="Foto enviada pelo cidadão"
                loading="lazy"
                className="aspect-[16/10] w-full rounded-field border border-line bg-surface-sunken object-cover"
              />
            )}

            <div className="rounded-field bg-surface-sunken p-4">
              <p className="field-label">Solicitante</p>
              <p className="flex items-center gap-2 text-sm font-medium text-content">
                <IconUser className="h-4 w-4 text-content-tertiary" />
                {ticket.citizen.name}
              </p>
              <p className="mt-0.5 pl-6 text-sm text-content-secondary">{ticket.citizen.email}</p>
            </div>

            <div className="rounded-field bg-surface-sunken p-4">
              <p className="field-label">Localização</p>
              <p className="flex items-center gap-2 font-mono text-sm text-content-secondary">
                <IconPin className="h-4 w-4 text-accent" />
                {coords(ticket.latitude, ticket.longitude)}
              </p>
            </div>
          </div>

          <section>
            <h3 className="field-label">Linha do tempo</h3>
            <div className="mt-4">
              <Timeline events={ticket.timeline} />
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}
