import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler';
import { prisma } from '../../infra/prisma';
import { requireAuth, requireRole } from '../../middleware/auth';
import { TICKET_STATUSES, type TicketStatus } from '@zeladoria/shared';
import { toTicketListDTO } from '../tickets/ticket.mapper';

export const metricsRoutes = Router();

metricsRoutes.use(requireAuth, requireRole('admin'));

/** Requisito 3.2.3: KPIs + 5 chamados mais recentes. */
metricsRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    // COUNT + GROUP BY direto. Materializar isso só se e quando medir lentidão.
    const [grouped, total, recent] = await Promise.all([
      prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.ticket.count(),
      prisma.ticket.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const byStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));

    /**
     * As chaves eram fixas em pending/inProgress/done. Ao entrar `forwarded`,
     * ele apareceria no groupBy e seria descartado em silêncio — sem erro de
     * tipo, porque este objeto é montado à mão. O efeito seria
     * `pending + inProgress + done ≠ total` e a barra de distribuição do painel
     * mentindo a porcentagem.
     *
     * `byStatus` é montado a partir do enum para que um status novo entre
     * sozinho e a soma continue fechando.
     */
    const counts = Object.fromEntries(
      TICKET_STATUSES.map((s) => [s, byStatus[s] ?? 0])
    ) as Record<TicketStatus, number>;

    res.json({
      total,
      pending: counts.pending,
      inProgress: counts.in_progress,
      done: counts.done,
      forwarded: counts.forwarded,
      // Mapa completo por status: o cliente soma isto e bate com `total`,
      // sem depender de a rota lembrar de expor cada novo status.
      byStatus: counts,
      recent: await toTicketListDTO(recent, 'admin'),
    });
  })
);
