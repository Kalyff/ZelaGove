import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BOARD_STATUSES,
  STATUS_LABELS_ADMIN,
  type TicketDTO,
  type TicketPageDTO,
  type TicketStatus,
} from '@zeladoria/shared';
import { ErrorState, IconSearch, Skeleton, useAnnouncer, useToast } from '@zeladoria/ui';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CompletionModal } from '../components/CompletionModal';
import { ForwardModal } from '../components/ForwardModal';
import { KanbanCard } from '../components/KanbanCard';
import { KanbanColumn } from '../components/KanbanColumn';
import { TicketModal } from '../components/TicketModal';
import { forwardTicket, listTickets, updateStatus } from '../lib/api';
import { kanbanCoordinateGetter } from '../lib/kanbanKeyboard';
import { invalidateTicketViews, queryKeys } from '../lib/queryKeys';
import { useMutationError } from '../lib/useMutationError';

/**
 * O chamado como ficará depois da troca de status, antes de o servidor responder.
 *
 * ÚNICA exceção à regra "o rótulo vem do servidor": este é o mesmo mapa que o
 * servidor aplica para o público admin (packages/shared/src/labels.ts), vive
 * menos de 300ms e o refetch o sobrescreve com o valor real. Não "corrigir"
 * isto para ler do servidor — aqui ainda não há resposta.
 */
function withStatus(ticket: TicketDTO, status: TicketStatus): TicketDTO {
  return { ...ticket, status, statusLabel: STATUS_LABELS_ADMIN[status] };
}

export default function WorkOrders() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { announce } = useAnnouncer();
  const mutationError = useMutationError();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [completing, setCompleting] = useState<TicketDTO | null>(null);
  const [forwarding, setForwarding] = useState<TicketDTO | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  /**
   * Card SOLTO numa coluna nova que o cache ainda não moveu.
   *
   * O dnd-kit mede para onde o card levantado deve pousar no mesmo commit em
   * que o arrasto termina. O update otimista do cache chega depois (passa por
   * `await cancelQueries` e pelo agendador do TanStack). Sem isto, o card
   * levantado voltava para a coluna de ORIGEM enquanto o card real voava da
   * origem para o destino — dois cards cruzando, com cara de bug. Como estado
   * React no mesmo handler, o card já está no destino quando a medida acontece.
   */
  const [dropped, setDropped] = useState<{ id: string; status: TicketStatus } | null>(null);

  /* A visão geral abre uma ordem por `?ticket=<id>`. */
  const openTicketId = searchParams.get('ticket');
  const setOpenTicketId = (id: string | null) => {
    setSearchParams(id ? { ticket: id } : {}, { replace: true });
  };

  const sensors = useSensors(
    // Arrasto só começa após 6px de movimento: sem isso, um clique no card
    // dispara drag e o modal de detalhes nunca abre.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Espaço/Enter inicia e encerra; setas trocam de coluna.
    useSensor(KeyboardSensor, { coordinateGetter: kanbanCoordinateGetter }),
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.boardTickets,
    /* Só os status que viram coluna. Sem o filtro, os encaminhados ocupariam o
       teto de 100 linhas sem aparecer em lugar nenhum do quadro — e empurrariam
       chamados PENDENTES para fora da resposta. */
    queryFn: () => listTickets({ status: [...BOARD_STATUSES] }),
  });
  const tickets = useMemo(() => {
    const list = data?.data ?? [];
    return dropped
      ? list.map((t) => (t.id === dropped.id ? withStatus(t, dropped.status) : t))
      : list;
  }, [data, dropped]);

  const mutation = useMutation({
    mutationFn: updateStatus,
    /**
     * Update otimista.
     *
     * Sem isto o card voltava para a coluna de origem e só se mexia quando o
     * refetch respondia — em conexão ruim o arrasto parecia simplesmente não
     * ter funcionado, e o servidor arrastava de novo.
     */
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boardTickets });
      const previous = queryClient.getQueryData<TicketPageDTO>(queryKeys.boardTickets);

      queryClient.setQueryData<TicketPageDTO>(queryKeys.boardTickets, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((t) => (t.id === vars.id ? withStatus(t, vars.status) : t)),
            }
          : old,
      );

      return { previous };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(queryKeys.boardTickets, ctx.previous);
      mutationError.capture(err);
    },
    onSuccess: (_data, vars) => {
      setCompleting(null);
      mutationError.clear();
      announce(`Ordem movida para ${STATUS_LABELS_ADMIN[vars.status]}.`);
    },
    onSettled: (_data, _error, vars) => {
      /* Aqui o cache já tem o valor otimista (ou o rollback do onError): tirar
         o override não move nada. Só limpa se for o MESMO movimento — a
         resposta de um arrasto anterior não pode desfazer o atual. */
      setDropped((d) => (d?.id === vars.id && d.status === vars.status ? null : d));
      return invalidateTicketViews(queryClient);
    },
  });

  /**
   * Encaminhar tem mutação PRÓPRIA, sem update otimista.
   *
   * O otimista do arrasto existe porque o card muda de coluna e o servidor
   * precisa ver o movimento na hora. Aqui o chamado SAI do quadro: fingir a
   * saída antes da confirmação faria o card sumir mesmo quando o servidor
   * recusasse — e um chamado que desaparece sem ter sido encaminhado é pior que
   * meio segundo de espera.
   */
  const forwardMutation = useMutation({
    mutationFn: forwardTicket,
    onError: mutationError.capture,
    onSuccess: (ticket) => {
      setForwarding(null);
      mutationError.clear();
      toast.success(
        ticket.forwardedTo
          ? `Encaminhamento a ${ticket.forwardedTo.name} registrado. Falta enviar pelo canal do órgão.`
          : 'Encaminhamento registrado.',
      );
      announce('Chamado encaminhado e removido do quadro.');
    },
    onSettled: () => invalidateTicketViews(queryClient),
  });

  /**
   * Requisito 4.8: busca em título E categoria, em tempo real. Roda no cliente
   * sobre os dados já carregados — assim o usuário digita o rótulo em português
   * ("Iluminação") e não o valor do enum ('lighting').
   */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tickets;
    return tickets.filter(
      (t) => t.title.toLowerCase().includes(term) || t.categoryLabel.toLowerCase().includes(term),
    );
  }, [tickets, search]);

  /* A contagem da busca era silenciosa para quem usa leitor de tela. */
  useEffect(() => {
    if (!search.trim()) return;
    const id = window.setTimeout(
      () =>
        announce(
          `${filtered.length} ${filtered.length === 1 ? 'ordem encontrada' : 'ordens encontradas'}.`,
        ),
      400,
    );
    return () => window.clearTimeout(id);
  }, [search, filtered.length, announce]);

  function requestStatusChange(ticket: TicketDTO, status: TicketStatus) {
    if (status === ticket.status) return;
    mutationError.clear();
    // Requisito 4.1: concluir sempre passa pelo modal, venha do arrasto ou do
    // seletor. Os demais status mudam direto.
    if (status === 'done') {
      setCompleting(ticket);
      return;
    }
    mutation.mutate({ id: ticket.id, status });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const status = event.over?.id as TicketStatus | undefined;
    const ticket = tickets.find((t) => t.id === event.active.id);
    if (!status || !ticket) return;
    /* Concluir abre o modal e o card fica onde estava até a confirmação —
       ali o card levantado voltar à origem é o certo. */
    if (status !== ticket.status && status !== 'done') {
      setDropped({ id: ticket.id, status });
    }
    requestStatusChange(ticket, status);
  }

  const activeTicket = activeId ? tickets.find((t) => t.id === activeId) : null;

  if (isError) {
    return (
      <ErrorState
        title="Não foi possível carregar as ordens de serviço"
        description="Verifique a conexão com a API e tente novamente."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative mb-5 max-w-md">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título ou categoria"
          aria-label="Buscar ordens de serviço"
          className="field-input pl-10"
        />
      </div>

      {/* O banner é para o erro do ARRASTO. Quando um modal está aberto, a
          mensagem já aparece lá dentro — mostrá-la aqui também a duplicaria. */}
      {mutationError.message && !completing && !forwarding && (
        <div className="mb-4">
          <ErrorState title="Não foi possível mover a ordem" description={mutationError.message} />
        </div>
      )}

      {isLoading ? (
        <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-3" aria-hidden>
          {BOARD_STATUSES.map((s) => (
            <div key={s} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-28 w-full rounded-card" />
              <Skeleton className="h-28 w-full rounded-card" />
            </div>
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
          accessibility={{
            announcements: {
              onDragStart: ({ active }) => `Arrastando ordem ${active.id}.`,
              onDragOver: ({ over }) =>
                over
                  ? `Sobre a coluna ${STATUS_LABELS_ADMIN[over.id as TicketStatus]}.`
                  : 'Fora de qualquer coluna.',
              onDragEnd: ({ over }) =>
                over
                  ? `Solto em ${STATUS_LABELS_ADMIN[over.id as TicketStatus]}.`
                  : 'Arrasto cancelado.',
              onDragCancel: () => 'Arrasto cancelado.',
            },
          }}
        >
          {/* Carrossel com encaixe abaixo de `lg`, grade de três acima. */}
          <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-x-visible">
            {BOARD_STATUSES.map((status) => {
              const columnTickets = filtered.filter((t) => t.status === status);
              return (
                <KanbanColumn
                  key={status}
                  status={status}
                  label={STATUS_LABELS_ADMIN[status]}
                  count={columnTickets.length}
                >
                  {columnTickets.map((ticket) => (
                    <KanbanCard
                      key={ticket.id}
                      ticket={ticket}
                      skipFlight={ticket.id === dropped?.id}
                      onOpen={() => setOpenTicketId(ticket.id)}
                      onStatusChange={(s) => requestStatusChange(ticket, s)}
                      onForward={() => {
                        mutationError.clear();
                        setForwarding(ticket);
                      }}
                    />
                  ))}
                </KanbanColumn>
              );
            })}
          </div>

          {/* O card levantado segue o cursor acima de tudo. Antes o original
              ficava em opacity-40 e deslizava por baixo dos irmãos. */}
          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
            {activeTicket ? <KanbanCard ticket={activeTicket} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <TicketModal
        ticketId={openTicketId}
        onClose={() => setOpenTicketId(null)}
      />

      <CompletionModal
        ticket={completing}
        busy={mutation.isPending}
        error={mutationError.message}
        errorField={mutationError.field}
        onCancel={() => {
          setCompleting(null);
          mutationError.clear();
        }}
        onConfirm={(note, photo) =>
          completing && mutation.mutate({ id: completing.id, status: 'done', note, photo })
        }
      />

      <ForwardModal
        ticket={forwarding}
        busy={forwardMutation.isPending}
        error={mutationError.message}
        errorField={mutationError.field}
        onCancel={() => {
          setForwarding(null);
          mutationError.clear();
        }}
        onConfirm={(input) => forwarding && forwardMutation.mutate({ id: forwarding.id, ...input })}
      />
    </div>
  );
}
