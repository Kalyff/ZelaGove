import { Router } from 'express';
import {
  appendExternalProtocolSchema,
  forwardTicketSchema,
  listTicketsQuerySchema,
  updateTicketStatusSchema,
} from '@zeladoria/shared';
import { asyncHandler } from '../../http/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/auth';
import { toMapPointDTO, toTicketDTO, toTicketListDTO, toTimelineDTO } from './ticket.mapper';
import { getTicketForAdmin, listAllTickets, listTicketsForMap } from './ticket.queries';
import {
  appendExternalProtocol,
  forwardTicket,
  updateTicketStatus,
} from './ticket.service';
import { photoUpload, savePhotoIfPresent } from './upload';

export const adminTicketRoutes = Router();

adminTicketRoutes.use(requireAuth, requireRole('admin'));

adminTicketRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, q, page, perPage } = listTicketsQuerySchema.parse(req.query);
    const [tickets, total] = await listAllTickets({
      status, q, skip: (page - 1) * perPage, take: perPage,
    });
    res.json({ data: await toTicketListDTO(tickets, 'admin'), total, page, perPage });
  })
);

/**
 * Payload enxuto para o mapa (requisito 3.2.4).
 *
 * Registrada ANTES de `/:id`: o Express casa na ordem, e sem isto "map"
 * chegaria como um id e a resposta seria 404.
 */
adminTicketRoutes.get(
  '/map',
  asyncHandler(async (_req, res) => {
    const tickets = await listTicketsForMap();
    res.json({ data: tickets.map(toMapPointDTO) });
  })
);

adminTicketRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const ticket = await getTicketForAdmin(req.params.id);
    res.json({
      ...(await toTicketDTO(ticket, 'admin')),
      citizen: ticket.user,
      timeline: await toTimelineDTO(ticket.events, 'admin'),
    });
  })
);

/**
 * Requisito 3.2.7: mesma rota serve ao drag-and-drop e ao seletor de status.
 * A obrigatoriedade da observação ao concluir é validada aqui e de novo no
 * service — o botão desabilitado no modal é UX, não controle.
 */
adminTicketRoutes.patch(
  '/:id/status',
  photoUpload.single('photo'),
  asyncHandler(async (req, res) => {
    const input = updateTicketStatusSchema.parse(req.body);
    const photoKey = await savePhotoIfPresent(req, 'completions');
    const ticket = await updateTicketStatus(req.params.id, req.user!.id, input, photoKey);
    res.json(await toTicketDTO(ticket, 'admin'));
  })
);

/**
 * Encaminhamento a órgão externo — rota PRÓPRIA, não o PATCH de status.
 *
 * Separada de propósito: o PATCH também é o caminho do arrasto no Kanban, que
 * não tem como informar o órgão. Reusá-lo permitiria soltar um card e produzir
 * um chamado "encaminhado" para lugar nenhum. O PATCH recusa `forwarded`.
 *
 * A entrega ao órgão é MANUAL: isto registra e audita, não envia nada. Quem
 * encaminha de fato é o servidor, pelo canal do órgão.
 */
adminTicketRoutes.post(
  '/:id/forward',
  asyncHandler(async (req, res) => {
    const input = forwardTicketSchema.parse(req.body);
    const ticket = await forwardTicket(req.params.id, req.user!.id, input);
    res.json(await toTicketDTO(ticket, 'admin'));
  })
);

/** Anota o protocolo devolvido pelo órgão, que costuma chegar dias depois. */
adminTicketRoutes.post(
  '/:id/external-protocol',
  asyncHandler(async (req, res) => {
    const input = appendExternalProtocolSchema.parse(req.body);
    const ticket = await appendExternalProtocol(req.params.id, req.user!.id, input);
    res.json(await toTicketDTO(ticket, 'admin'));
  })
);
