import { useQuery } from '@tanstack/react-query';
import {
  Button,
  ErrorState,
  IconBack,
  IconButton,
  IconPin,
  Skeleton,
  SkeletonText,
  StatusBadge,
} from '@zeladoria/ui';
import { useNavigate, useParams } from 'react-router-dom';
import { ForwardedNotice } from '../components/ForwardedNotice';
import { Timeline } from '../components/Timeline';
import { getTicket } from '../lib/api';
import { coords } from '../lib/format';

export default function TicketDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const {
    data: ticket,
    isLoading,
    isError,
    refetch,
  } = useQuery({ queryKey: ['ticket', id], queryFn: () => getTicket(id) });

  const mapsUrl = ticket
    ? `https://www.google.com/maps?q=${ticket.latitude},${ticket.longitude}`
    : '#';

  /* O protocolo externo vive nos EVENTOS, não no chamado — e pode ter chegado
     dias depois do encaminhamento. Pega-se o mais recente do órgão ATUAL: se o
     chamado foi revertido e reencaminhado a outro órgão, o número antigo não
     serve mais e não deve aparecer como se servisse. */
  const externalProtocol =
    ticket?.forwardedTo
      ? (ticket.timeline.find(
          (e) => e.externalProtocol && e.agency?.id === ticket.forwardedTo?.id,
        )?.externalProtocol ?? null)
      : null;

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
        <IconButton label="Voltar aos meus chamados" onClick={() => navigate('/chamados')}>
          <IconBack />
        </IconButton>
        <h1 className="font-mono text-sm font-medium tracking-wide text-content">
          {ticket ? `Protocolo ${ticket.protocol}` : 'Protocolo'}
        </h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pb-10">
        {isLoading && (
          <div aria-hidden>
            <Skeleton className="aspect-[16/10] w-full rounded-none" />
            <div className="space-y-4 px-6 pt-6">
              <Skeleton className="h-[26px] w-32 rounded-full" />
              <SkeletonText className="h-5 w-3/4" />
              <SkeletonText className="w-full" />
              <SkeletonText className="w-2/3" />
              <div className="space-y-4 pt-4">
                {[0, 1].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <SkeletonText className="w-1/3" />
                      <SkeletonText className="w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {isError && (
          <div className="space-y-3 px-6 pt-6">
            <ErrorState
              title="Chamado não encontrado"
              description="Ele pode ter sido removido, ou o endereço está incorreto."
              onRetry={() => refetch()}
            />
            <Button variant="ghost" fullWidth onClick={() => navigate('/chamados')}>
              Voltar aos meus chamados
            </Button>
          </div>
        )}

        {ticket && (
          <>
            {ticket.photoUrl && (
              <div className="relative">
                {/* `aspect-[16/10]` reserva o espaço antes da imagem chegar —
                    a altura fixa de antes não impedia o salto no carregamento. */}
                <img
                  src={ticket.photoUrl}
                  alt="Foto enviada na abertura do chamado"
                  loading="lazy"
                  className="aspect-[16/10] w-full bg-surface-sunken object-cover"
                />
                <span className="absolute left-4 top-4">
                  <StatusBadge status={ticket.status} label={ticket.statusLabel} onImage />
                </span>
              </div>
            )}

            <div className="space-y-5 px-6 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-surface-sunken px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-content-secondary">
                  {ticket.categoryLabel}
                </span>
                {!ticket.photoUrl && (
                  <StatusBadge status={ticket.status} label={ticket.statusLabel} />
                )}
              </div>

              <div>
                <h2 className="font-display text-xl font-extrabold leading-snug text-content">
                  {ticket.title}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-content-secondary">
                  {ticket.description}
                </p>
              </div>

              {/* Antes da localização e da linha do tempo: quando o chamado é
                  de outro órgão, essa é a informação que o cidadão veio buscar.
                  Enterrá-la no fim da página é o mesmo que não tê-la. */}
              {ticket.status === 'forwarded' && ticket.forwardedTo && (
                <ForwardedNotice
                  agency={ticket.forwardedTo}
                  externalProtocol={externalProtocol}
                />
              )}

              <section className="rounded-card bg-surface-sunken px-4 py-3">
                <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-content-secondary">
                  Localização
                </h3>
                <p className="mt-1 flex items-center gap-2 font-mono text-xs text-content-secondary">
                  <IconPin className="h-4 w-4 shrink-0 text-accent" />
                  {coords(ticket.latitude, ticket.longitude)}
                </p>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-block text-xs font-semibold text-accent underline"
                >
                  Abrir no mapa
                </a>
              </section>

              <section>
                {/* `<h3>` de verdade, e não um parágrafo com classe de rótulo:
                    a estrutura de cabeçalhos é como leitor de tela navega. */}
                <h3 className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-content-secondary">
                  Atualizações
                </h3>
                <div className="mt-4">
                  <Timeline events={ticket.timeline} />
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}
