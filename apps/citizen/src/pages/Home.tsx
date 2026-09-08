import { useQuery } from '@tanstack/react-query';
import { firstName, forwardedNotice, shortDate } from '@zeladoria/shared';
import {
  Button,
  EmptyState,
  ErrorState,
  IconInbox,
  IconPlus,
  Skeleton,
  SkeletonText,
  StatusBadge,
  ThemeToggle,
  useAnnouncer,
} from '@zeladoria/ui';
import { m } from 'framer-motion';
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SignOutButton } from '../components/SignOutButton';
import { listMyTickets } from '../lib/api';
import { useAuth } from '@zeladoria/client';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { announce } = useAnnouncer();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: listMyTickets,
  });

  const tickets = data?.data ?? [];

  /* Sem isto, a lista termina de carregar e quem usa leitor de tela não fica
     sabendo: o conteúdo simplesmente troca em silêncio. */
  useEffect(() => {
    if (isLoading || isError) return;
    announce(
      tickets.length === 0
        ? 'Nenhum chamado encontrado.'
        : `${tickets.length} ${tickets.length === 1 ? 'chamado' : 'chamados'}.`,
    );
  }, [isLoading, isError, tickets.length, announce]);

  return (
    <>
      <header className="px-6 pb-4 pt-6">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">gov.br</p>
          {/* Sair veio da barra inferior para cá: é ação, não destino, e ao lado
              dos botões de navegação era clicável por engano. */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-content">
          Bem-vindo, {user ? firstName(user.name) : ''}
        </h1>
        {isLoading ? (
          <SkeletonText className="mt-2 w-28" />
        ) : (
          <p className="mt-1 text-sm text-content-secondary">
            {tickets.length} {tickets.length === 1 ? 'registro' : 'registros'}
          </p>
        )}
      </header>

      {/* O padding inferior abre espaço para a barra flutuante + safe area. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(7rem+var(--safe-b))]">
        {isError && (
          <ErrorState
            title="Não foi possível carregar seus chamados"
            description="Verifique sua conexão e tente novamente."
            onRetry={() => refetch()}
          />
        )}

        {/* Skeleton com a MESMA geometria do card real: badge, data, título,
            descrição. Um placeholder que não bate com o resultado é só um
            spinner caro — o ganho está em nada saltar quando o dado chega. */}
        {isLoading && (
          <ul className="space-y-3" aria-hidden>
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="rounded-card border border-line bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-[26px] w-28 rounded-full" />
                  <SkeletonText className="w-12" />
                </div>
                <SkeletonText className="mt-3 w-3/4" />
                <SkeletonText className="mt-2 w-1/2" />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !isError && tickets.length === 0 && (
          <EmptyState
            Icon={IconInbox}
            title="Nenhum chamado aberto ainda."
            description="Viu um problema na rua? Registrar leva menos de um minuto."
            action={
              /* O vazio antes só DESCREVIA o botão verde ("toque no botão").
                 Agora oferece o caminho. */
              <Button
                iconLeft={<IconPlus className="h-4 w-4" />}
                onClick={() => navigate('/chamados/novo')}
              >
                Abrir meu primeiro chamado
              </Button>
            }
          />
        )}

        {!isLoading && tickets.length > 0 && (
          <ul className="space-y-3">
            {tickets.map((ticket, i) => (
              <m.li
                key={ticket.id}
                /* Só `y` — a opacidade fica em 1, para o chamado do cidadão não
                   depender do rAF para existir. Ver a regra em motion.ts. */
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={`/chamados/${ticket.id}`}
                  className="block rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-sunken active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge status={ticket.status} label={ticket.statusLabel} />
                    <time
                      className="font-mono text-xs text-content-tertiary"
                      dateTime={ticket.createdAt}
                    >
                      {shortDate(ticket.createdAt)}
                    </time>
                  </div>
                  <p className="mt-2.5 truncate font-display font-bold text-content">
                    {ticket.title}
                  </p>
                  <p className="truncate text-sm text-content-secondary">{ticket.description}</p>
                  {/* A coordenada crua saiu daqui: "-9.974990, -67.824300" não
                      diz nada numa linha de lista. A categoria diz. O par de
                      coordenadas continua no detalhe, sob rótulo. */}
                  {/* Na lista não cabe o painel do órgão, mas o cidadão não
                      pode precisar abrir o chamado para descobrir que ele saiu
                      da prefeitura. Uma frase resolve — e é a MESMA frase em
                      todo o sistema, definida em packages/shared. */}
                  {ticket.forwardedTo && (
                    <p className="mt-2 text-xs leading-relaxed text-content-secondary">
                      {forwardedNotice(ticket.forwardedTo)}
                    </p>
                  )}
                  <p className="mt-2 font-display text-[11px] font-bold uppercase tracking-[0.08em] text-content-tertiary">
                    {ticket.categoryLabel}
                  </p>
                </Link>
              </m.li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
