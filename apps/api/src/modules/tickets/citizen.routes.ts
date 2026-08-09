import { Router } from 'express';
import { createTicketSchema } from '@zeladoria/shared';
import { asyncHandler } from '../../http/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/auth';
import { toPublicTicketDTO, toTicketDTO, toTicketListDTO, toTimelineDTO } from './ticket.mapper';
import {
  createTicket,
  getCitizenTicket,
  listCitizenTickets,
  listPublicTickets,
} from './ticket.service';
import { photoUpload, savePhotoIfPresent } from './upload';

export const citizenTicketRoutes = Router();

citizenTicketRoutes.use(requireAuth, requireRole('citizen'));

citizenTicketRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const tickets = await listCitizenTickets(req.user!.id);
    res.json({ data: await toTicketListDTO(tickets, 'citizen'), total: tickets.length });
  })
);

citizenTicketRoutes.post(
  '/',
  photoUpload.single('photo'),
  asyncHandler(async (req, res) => {
    const input = createTicketSchema.parse(req.body);
    const photoKey = await savePhotoIfPresent(req, 'tickets');
    const ticket = await createTicket(req.user!.id, input, photoKey);
    res.status(201).json(await toTicketDTO(ticket, 'citizen'));
  })
);

/**
 * Lista "Na cidade": chamados de TODOS os cidadãos, em projeção reduzida.
 *
 * ATENÇÃO — esta rota devolve dado de outra pessoa DE PROPÓSITO. É a única do
 * app do cidadão que faz isso, e não contradiz o isolamento por `userId`: ela é
 * um caminho adicional com escopo deliberadamente diferente, cuja carga foi
 * reduzida na origem (ver `listPublicTickets`) para não conter nada que
 * identifique quem abriu. `GET /tickets` e `GET /tickets/:id` seguem escopados.
 *
 * Não é pública para a internet: `requireAuth` + `requireRole('citizen')`
 * valem para todo este router, então é preciso estar autenticado como cidadão.
 *
 * Registrada ANTES de `/:id`: o Express casa na ordem, e sem isto "public"
 * chegaria como um id e a resposta seria 404. Mesmo motivo de `/map` vir antes
 * de `/:id` no router do painel.
 */
citizenTicketRoutes.get(
  '/public',
  asyncHandler(async (_req, res) => {
    const tickets = await listPublicTickets();
    res.json({ data: tickets.map(toPublicTicketDTO), total: tickets.length });
  })
);

citizenTicketRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const ticket = await getCitizenTicket(req.user!.id, req.params.id);
    res.json({
      ...(await toTicketDTO(ticket, 'citizen')),
      // Requisito 4.2: o cidadão vê a timeline completa, inclusive notas e
      // fotos do gestor. Transparência é funcionalidade, não vazamento.
      timeline: await toTimelineDTO(ticket.events, 'citizen'),
    });
  })
);
