import { Router } from 'express';
import { createTicketSchema } from '@zeladoria/shared';
import { asyncHandler } from '../../http/asyncHandler';
import { requireAuth, requireRole } from '../../middleware/auth';
import {
  toCitizenTicketDetailDTO,
  toPublicTicketDTO,
  toTicketDTO,
  toTicketListDTO,
} from './ticket.mapper';
import {
  getCitizenTicket,
  getPublicTicket,
  listCitizenTickets,
  listPublicTickets,
} from './ticket.queries';
import { createTicket } from './ticket.service';
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
 * "Na cidade": chamados de TODOS os cidadãos — a lista, em projeção reduzida,
 * e o detalhe de cada um.
 *
 * ATENÇÃO — estas duas rotas devolvem dado de outra pessoa DE PROPÓSITO. São as
 * únicas do app do cidadão que fazem isso, e não contradizem o isolamento por
 * `userId`: são um caminho adicional com escopo deliberadamente diferente
 * (`publicScope`), e nenhuma das duas carrega quem abriu. `GET /tickets` e
 * `GET /tickets/:id` seguem escopados.
 *
 * Não são públicas para a internet: `requireAuth` + `requireRole('citizen')`
 * valem para todo este router, então é preciso estar autenticado como cidadão.
 *
 * `/public` é registrada ANTES de `/:id`: o Express casa na ordem, e sem isto
 * "public" chegaria como um id e a resposta seria 404. Mesmo motivo de `/map`
 * vir antes de `/:id` no router do painel.
 */
citizenTicketRoutes.get(
  '/public',
  asyncHandler(async (_req, res) => {
    const tickets = await listPublicTickets();
    res.json({ data: tickets.map(toPublicTicketDTO), total: tickets.length });
  })
);

citizenTicketRoutes.get(
  '/public/:id',
  asyncHandler(async (req, res) => {
    const ticket = await getPublicTicket(req.params.id);
    res.json(await toCitizenTicketDetailDTO(ticket));
  })
);

citizenTicketRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const ticket = await getCitizenTicket(req.user!.id, req.params.id);
    res.json(await toCitizenTicketDetailDTO(ticket));
  })
);
