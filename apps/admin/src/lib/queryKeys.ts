import type { QueryClient } from '@tanstack/react-query';

/**
 * As chaves do react-query num lugar só.
 *
 * Eram literais espalhados por oito arquivos, e o efeito não é cosmético: a
 * conclusão de uma ordem invalidava três chaves enquanto a reversão de um
 * encaminhamento invalidava cinco, então mudar o status com o modal de
 * detalhes aberto deixava o modal mostrando o estado anterior. Um mapa
 * ortográfico não resolve isso; `invalidateTicketViews` resolve.
 */
export const queryKeys = {
  /** Quadro de ordens: só os três status operacionais. */
  boardTickets: ['admin-tickets'] as const,
  forwardedTickets: ['forwarded-tickets'] as const,
  ticketDetail: (id: string | null) => ['admin-ticket', id] as const,
  metrics: ['metrics'] as const,
  mapPoints: ['map-points'] as const,
  agencies: ['agencies'] as const,
};

/**
 * Invalida TODAS as telas que enxergam um chamado.
 *
 * Qualquer escrita mexe no quadro, na lista de encaminhados, no detalhe aberto,
 * nos indicadores e no mapa — os cinco leem o mesmo dado por recortes
 * diferentes. Invalidar em bloco é mais barato que lembrar, a cada mutação
 * nova, de qual recorte também mudou.
 */
export function invalidateTicketViews(queryClient: QueryClient) {
  for (const key of [
    queryKeys.boardTickets,
    queryKeys.forwardedTickets,
    ['admin-ticket'],
    queryKeys.metrics,
    queryKeys.mapPoints,
  ]) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}
