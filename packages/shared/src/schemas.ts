import { z } from 'zod';
import { TICKET_CATEGORIES, TICKET_STATUSES } from './enums';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('E-mail inválido.'),
  password: z.string().min(1, 'Senha obrigatória.'),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Criação de chamado (requisito 3.1.4).
 * Vem por multipart/form-data, então todos os campos chegam como string:
 * z.coerce.number() cuida das coordenadas.
 */
export const createTicketSchema = z.object({
  title: z.string().trim().min(3, 'Título muito curto.').max(120),
  description: z.string().trim().min(5, 'Descreva um pouco mais.').max(2000),
  category: z.enum(TICKET_CATEGORIES, { errorMap: () => ({ message: 'Categoria inválida.' }) }),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

/**
 * Requisito 4.1: a transição para 'done' OBRIGA observação textual.
 * Este schema é compartilhado com o front (que desabilita o botão do modal),
 * mas quem manda é o servidor.
 */
export const updateTicketStatusSchema = z
  .object({
    status: z.enum(TICKET_STATUSES),
    note: z.string().trim().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'done' && !data.note) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['note'],
        message: 'Observação é obrigatória para concluir o chamado.',
      });
    }
    /**
     * Encaminhar NÃO passa por aqui — exige órgão, e esta rota também serve ao
     * arrasto do Kanban, que não tem como informá-lo. Sem esta recusa, soltar um
     * card numa coluna produziria um chamado "encaminhado" para lugar nenhum.
     */
    if (data.status === 'forwarded') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['status'],
        message: 'Use o encaminhamento para enviar a outro órgão.',
      });
    }
  });
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;

/**
 * Encaminhamento a órgão externo.
 *
 * O órgão é obrigatório; o protocolo externo NÃO. Na prática o número do outro
 * órgão quase nunca existe no momento do encaminhamento — chega dias depois, por
 * e-mail ou telefone. Exigi-lo aqui obrigaria o operador a inventar ou a adiar o
 * registro. Anotá-lo depois é `appendExternalProtocolSchema`.
 *
 * A justificativa é obrigatória pelo mesmo motivo que a observação de conclusão:
 * é o que impede o encaminhamento de virar lixeira para chamado difícil.
 */
export const forwardTicketSchema = z.object({
  agencyId: z.string().uuid('Selecione o órgão responsável.'),
  note: z.string().trim().min(5, 'Explique por que não é competência do município.').max(2000),
  externalProtocol: z.string().trim().max(120).optional(),
});
export type ForwardTicketInput = z.infer<typeof forwardTicketSchema>;

export const appendExternalProtocolSchema = z.object({
  externalProtocol: z.string().trim().min(1, 'Informe o protocolo do órgão.').max(120),
  note: z.string().trim().max(2000).optional(),
});
export type AppendExternalProtocolInput = z.infer<typeof appendExternalProtocolSchema>;

/**
 * `status` aceita UM valor ou vários separados por vírgula.
 *
 * O quadro de ordens precisa pedir exatamente os três status operacionais
 * (`?status=pending,in_progress,done`). Sem isso ele carregaria os encaminhados
 * junto e eles consumiriam o teto de 100 linhas — que é justamente o motivo de
 * `forwarded` não ser coluna. A forma de um valor só continua valendo, então a
 * visão filtrada (`?status=forwarded`) não muda.
 */
const statusFilterSchema = z
  .string()
  .transform((raw) => raw.split(',').map((s) => s.trim()).filter(Boolean))
  .pipe(z.array(z.enum(TICKET_STATUSES)).min(1, 'Status inválido.'))
  .optional();

export const listTicketsQuerySchema = z.object({
  status: statusFilterSchema,
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
});
