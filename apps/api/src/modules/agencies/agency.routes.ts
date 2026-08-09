import { Router } from 'express';
import { asyncHandler } from '../../http/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/auth';
import { listActiveAgencies } from '../tickets/ticket.service';

export const agencyRoutes = Router();

agencyRoutes.use(requireAuth, requireRole('admin'));

/**
 * Órgãos disponíveis para encaminhamento.
 *
 * Só os ativos: desativar um órgão preserva o histórico de quem já foi
 * encaminhado para lá, mas o tira do seletor. Excluir apagaria de onde o
 * chamado foi — por isso não existe rota de exclusão, e a FK é `Restrict`.
 */
agencyRoutes.get(
  '/',
  asyncHandler(async (_req, res) => {
    const agencies = await listActiveAgencies();
    res.json({
      data: agencies.map((a) => ({
        id: a.id,
        name: a.name,
        kind: a.kind,
        publicPhone: a.publicPhone,
        publicUrl: a.publicUrl,
        publicNote: a.publicNote,
      })),
    });
  })
);
