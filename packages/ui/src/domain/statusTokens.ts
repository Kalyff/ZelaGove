import type { TicketStatus } from '@zeladoria/shared';

/**
 * Fonte única de cor por status em toda a plataforma — inclusive no mapa.
 *
 * Decisão preservada da implementação anterior: "Pendente" é ÂMBAR em qualquer
 * superfície. Os requisitos traziam âmbar nos KPIs (3.2.3) e vermelho no mapa
 * (3.2.4) para o mesmo status; o vermelho fica reservado para erro de sistema,
 * não para estado de chamado.
 */
export const STATUS_HEX: Record<TicketStatus, string> = {
  pending: '#B54708',
  in_progress: '#1351B4',
  done: '#168821',
  /* Azul-acinzentado dessaturado: distinto dos tres operacionais sem inventar
     um matiz novo competindo com eles, e legivel nos dois basemaps — cinza puro
     nao e. Vermelho segue reservado a erro de sistema. */
  forwarded: '#5B6B85',
};

/**
 * Os mesmos status sobre basemap escuro.
 *
 * Não são os hex do claro clareados por fórmula: são as rungs 300/400 das
 * rampas, escolhidas por contraste. O #1351B4 sobre tile escuro fica em 2,5:1 —
 * o ponto simplesmente some do mapa.
 */
export const STATUS_HEX_DARK: Record<TicketStatus, string> = {
  pending: '#F5C863',
  in_progress: '#5B8FDD',
  done: '#3FA84F',
  forwarded: '#8FA0BD',
};

/** Contorno do ponto preciso: escuro sobre tile claro, claro sobre tile escuro. */
export const DOT_STROKE = { light: '#071D41', dark: '#F7F9FC' } as const;

/**
 * Classes do chip. Literais, nunca montadas em runtime — o Tailwind varre o
 * código como texto e uma classe interpolada não existe no CSS gerado.
 *
 * O texto do "concluído" vai na rung 700, não na 600: #168821 sobre green-100
 * fica em 3,70:1 e reprova AA.
 */
export const STATUS_CHIP: Record<TicketStatus, string> = {
  pending: 'bg-gov-amber-100 text-gov-amber-600 dark:bg-warn-soft dark:text-warn',
  in_progress: 'bg-gov-blue-100 text-gov-blue-700 dark:bg-accent-soft dark:text-accent-hover',
  done: 'bg-gov-green-100 text-gov-green-700 dark:bg-success-soft dark:text-success-onSoft',
  forwarded: 'bg-ink-100 text-ink-700 dark:bg-surface-sunken dark:text-content-secondary',
};

/**
 * Nó da linha do tempo — o círculo com o ícone do evento.
 *
 * Aqui e não em cada app: as duas timelines tinham este mapa copiado palavra
 * por palavra, e a cor do evento tem de ser a mesma nas duas pontas. O cidadão
 * e o servidor olham o mesmo histórico.
 */
export const STATUS_TIMELINE_NODE: Record<TicketStatus, string> = {
  pending: 'bg-warn-soft text-warn-onSoft',
  in_progress: 'bg-accent-soft text-accent-onSoft',
  done: 'bg-success text-success-on',
  forwarded: 'bg-ink-100 text-ink-700 dark:bg-surface-sunken dark:text-content-secondary',
};

/**
 * Raio do halo em METROS (requisito 3.2.4: maior para o que ainda demanda
 * ação). Em metros, e não em pixels, para o círculo escalar junto com o zoom —
 * em pixels os halos viram um borrão sólido ao afastar.
 */
export const HEAT_RADIUS_M: Record<TicketStatus, number> = {
  pending: 220,
  in_progress: 220,
  done: 110,
  /* ZERO de propósito: o chamado saiu das maos da prefeitura, entao nao
     representa carga de trabalho municipal no mapa. Aparece so como ponto. */
  forwarded: 0,
};

export const HEAT_OPACITY: Record<TicketStatus, number> = {
  pending: 0.28,
  in_progress: 0.28,
  done: 0.14,
  forwarded: 0,
};
