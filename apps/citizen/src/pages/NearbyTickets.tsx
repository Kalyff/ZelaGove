import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  PUBLIC_FEED_STATUSES,
  TICKET_CATEGORIES,
  distanceBetween,
  formatDistance,
  shortDate,
  supportLabel,
  type Point,
  type PublicTicketDTO,
} from "@zeladoria/shared";
import {
  Button,
  EmptyState,
  ErrorState,
  IconEye,
  IconMap,
  IconPin,
  IconSearch,
  Skeleton,
  SkeletonText,
  StatusBadge,
  ThemeToggle,
  cn,
  useAnnouncer,
} from "@zeladoria/ui";
import { m } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  FEED_ORDERS,
  FeedFilters,
  type FeedOrder,
} from "../components/FeedFilters";
import { SignOutButton } from "../components/SignOutButton";
import { useGeolocation } from "../hooks/useGeolocation";
import { listPublicTickets } from "../lib/api";

/**
 * Última posição obtida, em memória enquanto o app está aberto.
 *
 * Abrir um chamado e voltar remonta esta página, e o `useGeolocation` nasce
 * vazio. Sem isto, "Mais próximos" exigiria pedir o GPS de novo — e a página
 * só pede quando a pessoa toca em algo. Fica só em memória: posição não vai
 * para armazenamento nenhum.
 */
let lastPosition: Point | null = null;

/** Só dígitos e traço: alguém procurando um protocolo. */
const PROTOCOL_LIKE = /^\d[\d-]*$/;

function pick<T extends string>(
  value: string | null,
  options: readonly T[],
): T | null {
  return options.includes(value as T) ? (value as T) : null;
}

/**
 * "Na cidade": o que OUTRAS pessoas já registraram.
 *
 * Serve a duas coisas concretas — não abrir chamado duplicado, e ver que a
 * prefeitura executa. Por isso a lista traz também os concluídos recentes: uma
 * lista só de problema em aberto mostra fila, não trabalho.
 *
 * O cartão é enxuto (título, categoria, status e local) e leva ao detalhe completo em
 * `/chamados/na-cidade/:id` — texto, foto e andamento, sem quem abriu. É lá que
 * fica o "eu também vi isso", a alternativa a abrir um chamado duplicado.
 *
 * Busca, filtros e ordem moram na URL (`?busca=&status=&categoria=&ordem=`):
 * o cartão leva esse endereço ao detalhe, e o "voltar" de lá devolve a lista
 * como a pessoa a deixou.
 */
export default function NearbyTickets() {
  const { announce } = useAnnouncer();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const geo = useGeolocation();

  const status = pick(params.get("status"), PUBLIC_FEED_STATUSES);
  const category = pick(params.get("categoria"), TICKET_CATEGORIES);
  const order: FeedOrder = pick(params.get("ordem"), FEED_ORDERS) ?? "recent";

  /* O campo tem estado próprio e escreve na URL a cada tecla; a consulta usa a
     versão com atraso, para não ir ao servidor a cada letra. */
  const [search, setSearch] = useState(() => params.get("busca") ?? "");
  const [query, setQuery] = useState(search.trim());
  useEffect(() => {
    const id = window.setTimeout(() => setQuery(search.trim()), 300);
    return () => window.clearTimeout(id);
  }, [search]);

  function setParam(key: string, value: string | null) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  const filtering = Boolean(query || status || category);
  function clearFilters() {
    setSearch("");
    setQuery("");
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const key of ["busca", "status", "categoria"]) next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  useEffect(() => {
    if (geo.position) lastPosition = geo.position;
  }, [geo.position]);
  const position = geo.position ?? lastPosition;

  function changeOrder(value: FeedOrder) {
    setParam("ordem", value === "recent" ? null : value);
    /* O GPS só é pedido aqui, porque a pessoa escolheu — a página NUNCA o pede
       sozinha ao carregar. Pedir permissão sem o usuário ter solicitado nada é
       o caminho mais rápido para um "bloquear" permanente, e aí o recurso
       morre para sempre naquele aparelho. */
    if (value === "nearest" && !position) geo.capture();
  }

  /* Sem localização, "Mais próximos" não tem o que ordenar: volta para o
     padrão, e a mensagem do erro diz o que fazer. */
  useEffect(() => {
    if (!geo.error) return;
    setParams(
      (prev) => {
        if (prev.get("ordem") !== "nearest") return prev;
        const next = new URLSearchParams(prev);
        next.delete("ordem");
        return next;
      },
      { replace: true },
    );
  }, [geo.error, setParams]);

  const filters = {
    q: query || undefined,
    status: status ?? undefined,
    category: category ?? undefined,
    /* "Mais próximos" pede ao servidor a ordem padrão e reordena aqui. */
    sort: order === "nearest" ? ("recent" as const) : order,
  };
  const {
    data,
    isLoading,
    isError,
    isPlaceholderData,
    isFetchedAfterMount,
    refetch,
  } = useQuery({
    queryKey: ["public-tickets", filters],
    queryFn: () => listPublicTickets(filters),
    /* Trocar de filtro mantém a lista anterior na tela até a nova chegar, em
       vez de piscar um esqueleto a cada letra digitada. */
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const tickets = useMemo(() => {
    const list = data?.data ?? [];
    if (order !== "nearest" || !position) return list;
    /* Sobre uma cópia, para não reordenar o cache do react-query no lugar. */
    return [...list].sort(
      (a, b) => distanceBetween(position, a) - distanceBetween(position, b),
    );
  }, [data, order, position]);

  /* Só depois que a resposta dos filtros atuais chegou: anunciar a contagem da
     lista anterior, ainda na tela, seria anunciar o resultado errado. */
  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    if (isLoading || isError || isPlaceholderData) return;
    announce(
      filtering
        ? `${total} ${total === 1 ? "chamado encontrado" : "chamados encontrados"}.`
        : total === 0
          ? "Nenhum chamado registrado na cidade."
          : `${total} ${total === 1 ? "chamado" : "chamados"} na cidade.`,
    );
  }, [
    isLoading,
    isError,
    isPlaceholderData,
    filtersKey,
    filtering,
    total,
    announce,
  ]);

  const sortedByDistance = order === "nearest" && position !== null;
  useEffect(() => {
    if (sortedByDistance) announce("Lista ordenada por proximidade.");
  }, [sortedByDistance, announce]);

  const backTo = location.pathname + location.search;

  return (
    <>
      <header className="px-6 pb-3 pt-6">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">
            gov.br
          </p>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-content">
          Na cidade
        </h1>

        <FeedFilters
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setParam("busca", value.trim() || null);
          }}
          status={status}
          onStatusChange={(value) => setParam("status", value)}
          category={category}
          onCategoryChange={(value) => setParam("categoria", value)}
          order={order}
          onOrderChange={changeOrder}
        />

        {order === "nearest" && !position && (
          <div className="mt-2.5">
            {geo.loading ? (
              <p className="text-xs text-content-secondary" role="status">
                Procurando sua localização… {geo.elapsed}s
              </p>
            ) : (
              /* "Mais próximos" veio no endereço (recarregou a página) e a
                 posição não está em memória: pede só com o toque. */
              <Button
                variant="secondary"
                fullWidth
                iconLeft={<IconPin className="h-4 w-4" />}
                onClick={geo.capture}
              >
                Usar minha localização
              </Button>
            )}
          </div>
        )}
        {geo.error && (
          <p className="mt-2 text-xs leading-relaxed text-danger-onSoft">
            {geo.error}
          </p>
        )}
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
              <li
                key={i}
                className="rounded-card border border-line bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-[26px] w-28 rounded-full" />
                  <SkeletonText className="w-12" />
                </div>
                <SkeletonText className="mt-3 w-3/5" />
                <SkeletonText className="mt-2 w-1/4" />
              </li>
            ))}
          </ul>
        )}

        {!isLoading && !isError && (
          <>
            {tickets.length > 0 && (
              <div className="mb-3 flex items-center justify-between gap-3 text-xs text-content-secondary">
                <p>
                  {total > tickets.length
                    ? `Mostrando ${tickets.length} de ${total}`
                    : `${total} ${total === 1 ? "chamado" : "chamados"}`}
                </p>
                {filtering && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="font-semibold text-accent underline-offset-2 hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}

            {tickets.length === 0 ? (
              filtering ? (
                <EmptyState
                  Icon={IconSearch}
                  title="Nenhum chamado com esses filtros."
                  description={
                    PROTOCOL_LIKE.test(query)
                      ? "Seus chamados ficam em Meus chamados. Encaminhados a outro órgão e concluídos há mais de 30 dias não aparecem aqui."
                      : undefined
                  }
                  action={
                    <Button variant="secondary" onClick={clearFilters}>
                      Limpar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  Icon={IconMap}
                  title="Nenhum chamado por aqui ainda."
                  description="Quando outras pessoas registrarem problemas na cidade, eles aparecem nesta lista."
                />
              )
            ) : (
              <ul
                className={cn(
                  "space-y-3 transition-opacity",
                  isPlaceholderData && "opacity-60",
                )}
                aria-busy={isPlaceholderData}
              >
                {tickets.map((ticket, i) => (
                  <m.li
                    key={ticket.id}
                    /* Só `y`: a lista não pode depender do rAF para existir.
                       Ver a regra em packages/ui/src/lib/motion.ts. Vinda do
                       cache, a lista aparece pronta — ver Home.tsx. */
                    initial={isFetchedAfterMount ? { y: 10 } : false}
                    animate={{ y: 0 }}
                    transition={{
                      delay: Math.min(i, 8) * 0.04,
                      duration: 0.22,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <PublicTicketCard
                      ticket={ticket}
                      backTo={backTo}
                      distance={
                        position ? distanceBetween(position, ticket) : null
                      }
                    />
                  </m.li>
                ))}
              </ul>
            )}

            {/* O teto dito com todas as letras: sem isto, a lista parece ter
                acabado quando só parou de vir. */}
            {total > tickets.length && tickets.length > 0 && (
              <p className="mt-4 text-center text-xs leading-relaxed text-content-tertiary">
                Mostrando os {tickets.length} primeiros de {total}. Use a busca
                ou os filtros para achar o que procura.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}

function PublicTicketCard({
  ticket,
  backTo,
  distance,
}: {
  ticket: PublicTicketDTO;
  /** Endereço da lista com os filtros, para o "voltar" do detalhe. */
  backTo: string;
  distance: number | null;
}) {
  return (
    <Link
      to={`/chamados/na-cidade/${ticket.id}`}
      state={{ backTo }}
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

      <p className="mt-2.5 font-display font-bold text-content">
        {ticket.title}
      </p>
      <p className="mt-0.5 text-sm text-content-secondary">
        {ticket.categoryLabel}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        {distance !== null && (
          <span className="flex items-center gap-1 text-sm text-content-secondary">
            <IconPin className="h-3.5 w-3.5 text-accent" />
            {formatDistance(distance)} de você
          </span>
        )}
        {ticket.supportCount > 0 && (
          <span className="flex items-center gap-1 text-sm text-content-secondary">
            <IconEye className="h-3.5 w-3.5 text-accent" />
            {supportLabel(ticket.supportCount)}
          </span>
        )}
        <span className="font-mono text-[11px] text-content-tertiary">
          {ticket.protocol}
        </span>
      </div>
    </Link>
  );
}
