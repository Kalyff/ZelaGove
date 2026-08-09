import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AGENCY_KIND_LABELS } from '@zeladoria/shared';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  IconExternal,
  IconRefresh,
  Skeleton,
  SkeletonText,
  StatusBadge,
  useAnnouncer,
  useToast,
} from '@zeladoria/ui';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalProtocolModal } from '../components/ExternalProtocolModal';
import { TicketModal } from '../components/TicketModal';
import {
  ApiError,
  appendExternalProtocol,
  listTickets,
  updateStatus,
  type TicketDTO,
} from '../lib/api';
import { dateTime } from '../lib/format';

const PER_PAGE = 20;

/**
 * Chamados que saíram das mãos da prefeitura.
 *
 * Vive FORA do quadro de ordens de propósito. `forwarded` é terminal e acumula
 * para sempre; virar uma quarta coluna faria os pendentes saírem em silêncio da
 * resposta de 100 linhas do quadro. Aqui há paginação de verdade — o parâmetro
 * `page` já existia na API e só não tinha interface.
 *
 * A tela também é o lugar de admitir o que o sistema NÃO faz: ele registrou o
 * encaminhamento, não entregou nada a ninguém. Sem isso escrito, um chamado que
 * ninguém repassou por fora fica aqui parecendo atendido.
 */
export default function Forwarded() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { announce } = useAnnouncer();
  const [searchParams, setSearchParams] = useSearchParams();
  const [annotating, setAnnotating] = useState<TicketDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  const page = Math.max(1, Number(searchParams.get('pagina') ?? 1) || 1);
  const openTicketId = searchParams.get('ticket');

  const setParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    setSearchParams(params, { replace: true });
  };

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['forwarded-tickets', page],
    queryFn: () => listTickets({ status: ['forwarded'], page, perPage: PER_PAGE }),
  });

  const tickets = data?.data ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PER_PAGE));

  /**
   * Trocar de página volta ao topo e anuncia onde se está.
   *
   * Nada disso vem de graça: mudar `?pagina=` não muda a rota, então o
   * `useRouteFocus` do Shell não dispara. Sem o scroll, quem clicava "Próxima"
   * continuava no fim da lista, encarando o rodapé de uma página cujo topo
   * nunca viu. Sem o anúncio, para quem usa leitor de tela a lista simplesmente
   * trocava de conteúdo em silêncio.
   */
  const previousPage = useRef(page);
  /* O anúncio fica pendente porque na troca de página `data` ainda é
     `undefined` — a chave da query mudou e a resposta não chegou. Anunciar ali
     diria a contagem da página anterior. */
  const announcePending = useRef(false);

  useEffect(() => {
    if (previousPage.current === page) return;
    previousPage.current = page;
    announcePending.current = true;
    /* Salto instantâneo, NÃO `behavior: 'smooth'`.
       O scroll suave do navegador roda em requestAnimationFrame e para junto
       com ele — medido: com a aba em segundo plano ele empacou em 106px e
       nunca chegou ao topo. É a mesma regra de packages/ui/src/lib/motion.ts,
       agora valendo para scroll: o resultado não pode depender do laço de
       animação. Além disso, trocar de página é substituição de conteúdo, não
       continuidade espacial — deslizar 2500px seria lento e desorientador. */
    document.getElementById('conteudo')?.scrollTo({ top: 0 });
  }, [page]);

  useEffect(() => {
    if (!data || !announcePending.current) return;
    announcePending.current = false;
    announce(`Página ${page} de ${lastPage}, ${data.data.length} chamados.`);
  }, [data, page, lastPage, announce]);

  /**
   * Página fora do intervalo volta para a última existente.
   *
   * `?pagina=` vem da URL, e a URL sobrevive ao dado: basta reverter alguns
   * encaminhamentos e um link salvo aponta para uma página que encolheu. Sem
   * isto a tela exibia "Página 99 de 2" ao lado de "Nenhum chamado
   * encaminhado" — enquanto havia 23. É a interface mentindo por causa de um
   * parâmetro velho.
   */
  useEffect(() => {
    if (!data || page <= lastPage) return;
    setParams({ pagina: String(lastPage) });
  }, [data, page, lastPage]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['forwarded-tickets'] });
    queryClient.invalidateQueries({ queryKey: ['admin-tickets'] });
    queryClient.invalidateQueries({ queryKey: ['admin-ticket'] });
    queryClient.invalidateQueries({ queryKey: ['metrics'] });
    queryClient.invalidateQueries({ queryKey: ['map-points'] });
  };

  const onMutationError = (err: Error) => {
    setError(err.message);
    setErrorField(err instanceof ApiError ? (err.field ?? null) : null);
    toast.error(err.message);
  };

  const protocolMutation = useMutation({
    mutationFn: appendExternalProtocol,
    onError: onMutationError,
    onSuccess: () => {
      setAnnotating(null);
      setError(null);
      setErrorField(null);
      toast.success('Protocolo anotado na linha do tempo.');
    },
    onSettled: invalidate,
  });

  /**
   * Reverter é o antídoto da classificação errada — e ela acontece. Volta pelo
   * PATCH normal, que é a rota certa: sair de `forwarded` é uma transição comum,
   * quem exige tratamento próprio é a entrada.
   */
  const revertMutation = useMutation({
    mutationFn: updateStatus,
    onError: onMutationError,
    onSuccess: () => {
      toast.success('Chamado devolvido para a fila municipal.');
      announce('Chamado devolvido para pendentes.');
    },
    onSettled: invalidate,
  });

  if (isError) {
    return (
      <ErrorState
        title="Não foi possível carregar os encaminhados"
        description="Verifique a conexão com a API e tente novamente."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <p className="flex gap-3 rounded-card border border-line bg-surface p-4 text-sm leading-relaxed text-content-secondary">
        <IconExternal className="mt-0.5 h-4 w-4 shrink-0 text-content-tertiary" />
        <span>
          Estes chamados foram <strong className="font-semibold text-content">registrados</strong>{' '}
          como responsabilidade de outro órgão. O sistema não os envia — o contato pelo canal do
          órgão é feito por fora, e o acompanhamento continua sendo da prefeitura.
        </span>
      </p>

      {isLoading ? (
        <div className="space-y-3" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-4">
              <SkeletonText className="w-1/2" />
              <SkeletonText className="mt-2 w-1/3" />
              <Skeleton className="mt-3 h-9 w-40 rounded-field" />
            </Card>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          Icon={IconExternal}
          title="Nenhum chamado encaminhado."
          description="Chamados enviados a outros órgãos aparecem aqui, com o órgão e o protocolo externo."
        />
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface-sunken px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.08em] text-content-secondary">
                        {ticket.categoryLabel}
                      </span>
                      <StatusBadge status={ticket.status} label={ticket.statusLabel} />
                      <span className="font-mono text-xs text-content-tertiary">
                        {ticket.protocol}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setParams({ ticket: ticket.id })}
                      aria-label={`Abrir detalhes de ${ticket.title}`}
                      className="mt-2 block w-full text-left"
                    >
                      <p className="font-display text-sm font-bold text-content">{ticket.title}</p>
                    </button>

                    {/* O órgão é o dado que justifica esta tela existir. */}
                    {ticket.forwardedTo && (
                      <p className="mt-1.5 text-sm text-content-secondary">
                        <span className="text-content-tertiary">Encaminhado a </span>
                        <strong className="font-semibold text-content">
                          {ticket.forwardedTo.name}
                        </strong>
                        <span className="text-content-tertiary">
                          {' '}
                          · {AGENCY_KIND_LABELS[ticket.forwardedTo.kind]}
                        </span>
                      </p>
                    )}
                    <p className="mt-1 font-mono text-xs text-content-tertiary">
                      Atualizado em {dateTime(ticket.updatedAt)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setError(null);
                        setErrorField(null);
                        setAnnotating(ticket);
                      }}
                    >
                      Anotar protocolo
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={revertMutation.isPending && revertMutation.variables?.id === ticket.id}
                      onClick={() =>
                        revertMutation.mutate({
                          id: ticket.id,
                          status: 'pending',
                          note: 'Encaminhamento revertido: chamado devolvido à fila municipal.',
                        })
                      }
                    >
                      <IconRefresh className="h-4 w-4" />
                      Reverter
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Paginação de verdade — a ausência dela é o que tirou `forwarded` do
          quadro. Aqui a lista cresce sem limite e continua navegável. */}
      {total > PER_PAGE && (
        <nav
          className="flex items-center justify-between gap-4 border-t border-line pt-4"
          aria-label="Paginação"
        >
          <p className="text-sm text-content-tertiary">
            Página <span className="font-mono tabular-nums">{page}</span> de{' '}
            <span className="font-mono tabular-nums">{lastPage}</span> ·{' '}
            <span className="font-mono tabular-nums">{total}</span>{' '}
            {total === 1 ? 'chamado' : 'chamados'}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setParams({ pagina: String(page - 1) })}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= lastPage}
              onClick={() => setParams({ pagina: String(page + 1) })}
            >
              Próxima
            </Button>
          </div>
        </nav>
      )}

      <TicketModal ticketId={openTicketId} onClose={() => setParams({ ticket: null })} />

      <ExternalProtocolModal
        ticket={annotating}
        busy={protocolMutation.isPending}
        error={error}
        errorField={errorField}
        onCancel={() => {
          setAnnotating(null);
          setError(null);
          setErrorField(null);
        }}
        onConfirm={(input) =>
          annotating && protocolMutation.mutate({ id: annotating.id, ...input })
        }
      />
    </div>
  );
}
