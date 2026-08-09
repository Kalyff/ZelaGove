/**
 * Contrato de erro único (§4.4 do plano). Todo erro tratado sai como:
 * { error: { code, message, field? } }
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  invalidCredentials: () =>
    new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.'),
  unauthenticated: () =>
    new AppError(401, 'UNAUTHENTICATED', 'Sessão expirada. Entre novamente.'),
  forbidden: () =>
    new AppError(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.'),
  // Requisito 4.6: chamado de outro cidadão responde 404, não 403 — 403
  // confirmaria a existência do recurso.
  ticketNotFound: () =>
    new AppError(404, 'TICKET_NOT_FOUND', 'Chamado não encontrado.'),
  completionNoteRequired: () =>
    new AppError(422, 'COMPLETION_NOTE_REQUIRED', 'Observação é obrigatória para concluir o chamado.', 'note'),
  invalidPhoto: () =>
    new AppError(422, 'INVALID_PHOTO', 'Não foi possível processar a imagem enviada.', 'photo'),
  photoTooLarge: () =>
    new AppError(422, 'PHOTO_TOO_LARGE', 'A foto é maior que 5MB. Escolha uma imagem menor.', 'photo'),
  agencyNotFound: () =>
    new AppError(422, 'AGENCY_NOT_FOUND', 'Órgão não encontrado ou desativado.', 'agencyId'),
  // Encaminhar exige órgão, e a rota genérica de status também serve ao arrasto
  // do Kanban, que não tem como informá-lo. Recusar aqui evita um chamado
  // "encaminhado" para lugar nenhum.
  useForwardEndpoint: () =>
    new AppError(422, 'USE_FORWARD_ENDPOINT', 'Use o encaminhamento para enviar a outro órgão.', 'status'),
  notForwarded: () =>
    new AppError(422, 'NOT_FORWARDED', 'Só é possível anotar protocolo externo em chamado encaminhado.', 'externalProtocol'),
};
