import { TICKET_STATUSES, type MetricsDTO, type TicketStatus } from '@zeladoria/shared';
import { prisma } from '../../infra/prisma';
import { toTicketListDTO } from '../tickets/ticket.mapper';

/** Quantos chamados mais recentes a visão geral mostra (requisito 3.2.3). */
const RECENT_LIMIT = 5;

/**
 * KPIs do painel.
 *
 * COUNT + GROUP BY direto. Materializar isso só se e quando medir lentidão.
 */
export async function getMetrics(): Promise<MetricsDTO> {
  const [grouped, total, recent] = await Promise.all([
    prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.ticket.count(),
    prisma.ticket.findMany({ orderBy: { createdAt: 'desc' }, take: RECENT_LIMIT }),
  ]);

  const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));

  /**
   * As chaves eram fixas em pending/inProgress/done. Ao entrar `forwarded`, ele
   * apareceria no groupBy e seria descartado em silêncio — sem erro de tipo,
   * porque este objeto é montado à mão. O efeito seria
   * `pending + inProgress + done ≠ total` e a barra de distribuição do painel
   * mentindo a porcentagem.
   *
   * `counts` é montado a partir do enum para que um status novo entre sozinho e
   * a soma continue fechando.
   */
  const counts = Object.fromEntries(
    TICKET_STATUSES.map((s) => [s, byStatus[s] ?? 0])
  ) as Record<TicketStatus, number>;

  return {
    total,
    pending: counts.pending,
    inProgress: counts.in_progress,
    done: counts.done,
    forwarded: counts.forwarded,
    // Mapa completo por status: o cliente soma isto e bate com `total`, sem
    // depender de a rota lembrar de expor cada novo status.
    byStatus: counts,
    recent: await toTicketListDTO(recent, 'admin'),
  };
}
