/**
 * Enums canonicos do dominio.
 * Estes valores sao a unica fonte de verdade: banco, API e clientes usam os
 * mesmos identificadores. Rotulos de exibicao ficam em labels.ts.
 */

export const USER_ROLES = ['citizen', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * TODOS os status. É esta a fonte dos `Record<TicketStatus, …>` espalhados pelo
 * design system — manter os quatro aqui é o que faz o compilador apontar cada
 * mapa que ficou incompleto.
 */
export const TICKET_STATUSES = ['pending', 'in_progress', 'done', 'forwarded'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/**
 * Os status que viram COLUNA no quadro de ordens — e só eles.
 *
 * `forwarded` fica de fora de propósito. Ele é terminal e acumula para sempre,
 * enquanto a listagem do painel carrega no máximo 100 ordens sem paginação na
 * interface: virar coluna faria os chamados pendentes saírem do quadro em
 * silêncio depois de 100 encaminhamentos. Encaminhados moram numa visão
 * filtrada à parte.
 *
 * Também é o que o `kanbanKeyboard` percorre, porque lá o índice no vetor é a
 * posição da coluna na tela.
 */
export const BOARD_STATUSES = ['pending', 'in_progress', 'done'] as const;
export type BoardStatus = (typeof BOARD_STATUSES)[number];

/**
 * Tipo de órgão externo. `secretaria` e `consorcio` existem porque o caso mais
 * comum não é federal: é outra secretaria da própria prefeitura, ou um consórcio
 * intermunicipal de resíduos. Sem eles, os dois virariam "outro" e o dado se
 * perderia justamente onde há mais volume.
 */
export const AGENCY_KINDS = [
  'federal',
  'estadual',
  'concessionaria',
  'secretaria',
  'consorcio',
  'outro',
] as const;
export type AgencyKind = (typeof AGENCY_KINDS)[number];

export const TICKET_CATEGORIES = [
  'lighting',
  'paving',
  'sanitation',
  'traffic',
  'cleaning',
  'other',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];
