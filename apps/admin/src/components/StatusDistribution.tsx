import { STATUS_LABELS_ADMIN, TICKET_STATUSES, type TicketStatus } from '@zeladoria/shared';

/**
 * Barra empilhada 100% da distribuição por status.
 *
 * NÃO é gráfico de biblioteca — e é deliberado. O `/admin/metrics` devolve só
 * quatro contadores: nenhuma série temporal, nenhum recorte por categoria,
 * nenhum SLA. Uma biblioteca de gráfico aqui desenharia tendência sobre dado
 * que não existe. Isto mostra exatamente o que há: proporção entre três
 * números, em CSS puro, sem dependência nova.
 *
 * Gráfico de verdade exige mudar a API, o que está fora do escopo.
 */
const BAR: Record<TicketStatus, string> = {
  pending: 'bg-gov-amber-600 dark:bg-warn',
  in_progress: 'bg-accent',
  done: 'bg-gov-green-600 dark:bg-success',
  forwarded: 'bg-ink-400 dark:bg-ink-500',
};

export function StatusDistribution({
  counts,
  total,
}: {
  counts: Record<TicketStatus, number>;
  total: number;
}) {
  if (total === 0) return null;

  return (
    <section className="card p-5">
      <h2 className="font-display text-xs font-bold uppercase tracking-[0.1em] text-content-tertiary">
        Distribuição
      </h2>

      <div
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-sunken"
        role="img"
        aria-label={TICKET_STATUSES.map(
          (s) => `${STATUS_LABELS_ADMIN[s]}: ${counts[s]} de ${total}`,
        ).join('; ')}
      >
        {TICKET_STATUSES.map((status) =>
          counts[status] > 0 ? (
            <div
              key={status}
              className={BAR[status]}
              style={{ width: `${(counts[status] / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>

      {/* Legenda com número, não só cor: proporção lida a olho engana, e cor
          sozinha não é informação acessível. */}
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {TICKET_STATUSES.map((status) => (
          <li key={status} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${BAR[status]}`} aria-hidden />
            <span className="text-sm text-content-secondary">{STATUS_LABELS_ADMIN[status]}</span>
            <span className="font-mono text-sm font-medium tabular-nums text-content">
              {counts[status]}
            </span>
            <span className="font-mono text-xs tabular-nums text-content-tertiary">
              ({Math.round((counts[status] / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>

      {/* Alternativa textual para quem usa leitor de tela: um gráfico sozinho
          não é acessível, por mais bem rotulado que esteja. */}
      <table className="sr-only">
        <caption>Distribuição de chamados por status</caption>
        <thead>
          <tr>
            <th scope="col">Status</th>
            <th scope="col">Quantidade</th>
          </tr>
        </thead>
        <tbody>
          {TICKET_STATUSES.map((status) => (
            <tr key={status}>
              <th scope="row">{STATUS_LABELS_ADMIN[status]}</th>
              <td>{counts[status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
