import { useQuery } from '@tanstack/react-query';
import {
  distanceBetween,
  formatDistance,
  shortDate,
  type PublicTicketDTO,
} from '@zeladoria/shared';
import {
  Button,
  EmptyState,
  ErrorState,
  IconMap,
  IconPin,
  Skeleton,
  SkeletonText,
  StatusBadge,
  ThemeToggle,
  useAnnouncer,
} from '@zeladoria/ui';
import { m } from 'framer-motion';
import { useEffect, useMemo } from 'react';
import { SignOutButton } from '../components/SignOutButton';
import { useGeolocation } from '../hooks/useGeolocation';
import { listPublicTickets } from '../lib/api';

/**
 * "Na cidade": o que outras pessoas já registraram.
 *
 * Serve a duas coisas concretas — não abrir chamado duplicado, e ver que a
 * prefeitura executa. Por isso a lista traz também os concluídos recentes: uma
 * lista só de problema em aberto mostra fila, não trabalho.
 *
 * NÃO leva ao detalhe, e não é esquecimento: não existe detalhe a mostrar. O
 * servidor manda categoria, status e local, e nada mais — a leitura completa de
 * um chamado continua escopada a quem o abriu.
 */
export default function NearbyTickets() {
  const { announce } = useAnnouncer();
  const { position, loading: locating, error: locationError, capture } = useGeolocation();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['public-tickets'],
    queryFn: listPublicTickets,
  });

  const tickets = useMemo(() => {
    const list = data?.data ?? [];
    if (!position) return list;
    /* Ordena por distância só quando o usuário pediu — e sobre uma cópia, para
       não reordenar o cache do react-query no lugar. */
    return [...list].sort(
      (a, b) => distanceBetween(position, a) - distanceBetween(position, b),
    );
  }, [data, position]);

  useEffect(() => {
    if (isLoading || isError) return;
    announce(
      tickets.length === 0
        ? 'Nenhum chamado registrado na cidade.'
        : `${tickets.length} ${tickets.length === 1 ? 'chamado' : 'chamados'} na cidade.`,
    );
  }, [isLoading, isError, tickets.length, announce]);

  useEffect(() => {
    if (position) announce('Lista reordenada por proximidade.');
  }, [position, announce]);

  return (
    <>
      <header className="px-6 pb-4 pt-6">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">gov.br</p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-content">Na cidade</h1>
        {/* "na cidade", e não "de outras pessoas": a lista inclui os seus
            também, de propósito. Escondê-los abriria a porta para você mesmo
            duplicar um chamado que já abriu — que é justamente o que esta tela
            existe para evitar. */}
        <p className="mt-1 text-sm leading-relaxed text-content-secondary">
          Tudo o que já foi registrado na cidade. Veja se o seu problema não foi avisado antes de
          abrir um chamado novo.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(7rem+var(--safe-b))]">
        {isError && (
          <ErrorState
            title="Não foi possível carregar os chamados da cidade"
            description="Verifique sua conexão e tente novamente."
            onRetry={() => refetch()}
          />
        )}

        {isLoading && (
          <ul className="space-y-3" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="rounded-card border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-[26px] w-28 rounded-full" />
                  <SkeletonText className="w-12" />
                </div>
                <SkeletonText className="mt-3 w-2/5" />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !isError && (
          <>
            {/*
              O botão dispara o GPS; a página NUNCA o pede sozinha ao carregar.
              Pedir permissão de localização sem o usuário ter solicitado nada é
              o caminho mais rápido para um "bloquear" permanente — e aí o
              recurso morre para sempre naquele aparelho.
            */}
            {!position && tickets.length > 0 && (
              <div className="mb-4">
                <Button
                  variant="secondary"
                  fullWidth
                  loading={locating}
                  iconLeft={<IconPin className="h-4 w-4" />}
                  onClick={capture}
                >
                  Ordenar por proximidade
                </Button>
                {locationError && (
                  <p className="mt-2 text-xs leading-relaxed text-danger-onSoft">{locationError}</p>
                )}
              </div>
            )}

            {tickets.length === 0 ? (
              <EmptyState
                Icon={IconMap}
                title="Nenhum chamado por aqui ainda."
                description="Quando alguém registrar um problema na cidade, ele aparece nesta lista."
              />
            ) : (
              <ul className="space-y-3">
                {tickets.map((ticket, i) => (
                  <m.li
                    key={ticket.id}
                    /* Só `y`: a lista não pode depender do rAF para existir.
                       Ver a regra em packages/ui/src/lib/motion.ts. */
                    initial={{ y: 10 }}
                    animate={{ y: 0 }}
                    transition={{
                      delay: Math.min(i, 8) * 0.04,
                      duration: 0.22,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <PublicTicketCard
                      ticket={ticket}
                      distance={position ? distanceBetween(position, ticket) : null}
                    />
                  </m.li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </>
  );
}

function PublicTicketCard({
  ticket,
  distance,
}: {
  ticket: PublicTicketDTO;
  distance: number | null;
}) {
  return (
    /* `<article>` e não `<Link>`: este cartão não leva a lugar nenhum, e um
       cartão clicável que não abre nada é pior que um cartão estático. */
    <article className="rounded-card border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={ticket.status} label={ticket.statusLabel} />
        <time className="font-mono text-xs text-content-tertiary" dateTime={ticket.createdAt}>
          {shortDate(ticket.createdAt)}
        </time>
      </div>

      <p className="mt-2.5 font-display font-bold text-content">{ticket.categoryLabel}</p>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {distance !== null && (
          <span className="flex items-center gap-1 text-sm text-content-secondary">
            <IconPin className="h-3.5 w-3.5 text-accent" />
            {formatDistance(distance)} de você
          </span>
        )}
        <span className="font-mono text-[11px] text-content-tertiary">{ticket.protocol}</span>
      </div>
    </article>
  );
}
