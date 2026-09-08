import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/auth';
import { getMetrics } from './metrics.service';

export const metricsRoutes = Router();

metricsRoutes.use(requireAuth, requireRole('admin'));

/** Requisito 3.2.3: KPIs + os chamados mais recentes. */
metricsRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json(await getMetrics());
  })
);
