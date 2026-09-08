import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/auth';
import { toAgencyDTO } from './agency.mapper';
import { listActiveAgencies } from './agency.service';

export const agencyRoutes = Router();

agencyRoutes.use(requireAuth, requireRole('admin'));

/** Lista para o seletor de encaminhamento. Ver `listActiveAgencies`. */
agencyRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const agencies = await listActiveAgencies();
    res.json({ data: agencies.map((a) => toAgencyDTO(a)) });
  })
);
