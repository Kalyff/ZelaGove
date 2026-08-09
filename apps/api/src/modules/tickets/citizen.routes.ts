import { Router } from 'express';
import { createTicketSchema } from '@zeladoria/shared';
import { asyncHandler } from '../../http/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/auth';
import { toTicketDTO, toTicketListDTO, toTimelineDTO } from './ticket.mapper';
import { createTicket, getCitizenTicket, listCitizenTickets } from './ticket.service';
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
