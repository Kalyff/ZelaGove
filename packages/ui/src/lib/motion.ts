import type { Transition, Variants } from 'framer-motion';

/**
 * Tokens de movimento.
 *
 * Uma única fonte de duração e curva para os dois apps: animação com ritmos
 * diferentes em telas diferentes é o que faz uma interface parecer montada por
 * pessoas que não se falaram.
 *
 * Regras que valem para tudo aqui:
 *  - só `transform` e `opacity`. Nada de `height`, `top` ou `left`, que forçam
 *    reflow e produzem CLS;
 *  - a saída dura 60-65% da entrada. Saída lenta faz a interface parecer
 *    presa, porque o usuário já decidiu e está esperando;
 *  - micro-interação entre 140 e 320ms. Acima de ~400ms o movimento deixa de
 *    ser resposta e vira espera.
 *
 * REGRA DE ROBUSTEZ — conteúdo não pode depender de animação para existir.
 *
 * O framer anima em `requestAnimationFrame`, e o navegador suspende o rAF em
 * aba oculta. Enquanto isso o estado `initial` continua aplicado: um
 * `initial={{ opacity: 0 }}` deixa o elemento INVISÍVEL até o laço rodar. Some
 * o JS falhar, demorar em 3G ou a aba estar em segundo plano e o cidadão fica
 * com a tela em branco, sem erro nenhum.
 *
 * Por isso `fadeUp` e `listContainer` só devem envolver conteúdo que já esteja
 * na tela por outro motivo (a lista renderiza; a animação é o tempero). Para
 * texto e dado crítico, prefira animar apenas `y`/`scale` e deixar a opacidade
 * em 1 — ou não animar. Sobreposição (modal, gaveta, aviso) pode usar opacidade
 * à vontade: ela só existe porque o JS rodou.
 */

/** Segundos — é a unidade do framer-motion. */
export const DUR = {
  fast: 0.14,
  base: 0.22,
  slow: 0.32,
  page: 0.26,
} as const;

export const EASE = {
  /** Entrada: rápido no começo, assenta no fim. */
  out: [0.16, 1, 0.3, 1],
  /** Saída: sai acelerando. */
  in: [0.7, 0, 0.84, 0],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const SPRING = {
  /** Deslocamento de elemento (card mudando de coluna). */
  soft: { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 },
  /** Resposta a toque (pressionar, FAB). */
  snap: { type: 'spring', stiffness: 500, damping: 32 },
} satisfies Record<string, Transition>;

/* ---------------------------------------------------------------------- */

/**
 * Entrada padrão de CONTEÚDO: sobe 8px.
 *
 * Sem opacidade no estado inicial, de propósito — é a regra de robustez acima.
 * Já se chamou `fadeUp` e começava em `opacity: 0`; o nome prometia um fade que
 * custava a visibilidade do conteúdo quando a animação não rodava. A saída pode
 * usar opacidade à vontade: ali o elemento está indo embora de qualquer forma.
 */
export const riseIn: Variants = {
  hidden: { y: 8 },
  show: { y: 0, transition: { duration: DUR.base, ease: EASE.out } },
  exit: { opacity: 0, y: 4, transition: { duration: DUR.fast, ease: EASE.in } },
};

/** Sobreposições: nascem levemente menores, como se viessem do gatilho. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: { duration: DUR.base, ease: EASE.out } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: DUR.fast, ease: EASE.in } },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.18, ease: EASE.out } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: EASE.in } },
};

/**
 * Container de lista. 40ms entre itens: abaixo de ~30ms o escalonamento não é
 * percebido, acima de ~50ms o fim da lista demora a chegar.
 */
export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

/** Painel lateral. */
export const sheetLeft: Variants = {
  hidden: { x: '-100%' },
  show: { x: 0, transition: { duration: DUR.slow, ease: EASE.out } },
  exit: { x: '-100%', transition: { duration: DUR.base, ease: EASE.in } },
};

/**
 * Transição de rota com direção.
 *
 * `dir` 1 é avanço (entra da direita), -1 é volta (entra da esquerda). A
 * direção precisa bater com o modelo mental de profundidade: avançar empurra
 * para dentro, voltar puxa para fora.
 */
export const pageSlide = (dir: 1 | -1): Variants => ({
  /* Sem opacidade na entrada: uma página inteira presa em `opacity: 0` é a
     tela branca que já aconteceu no painel. Deslocada 24px é recuperável;
     invisível, não. */
  hidden: { x: dir * 24 },
  show: { x: 0, transition: { duration: DUR.page, ease: EASE.out } },
  exit: { opacity: 0, x: dir * -16, transition: { duration: DUR.fast, ease: EASE.in } },
});

/**
 * Escalonamento com teto.
 *
 * Sem teto, o 40º item de uma lista entraria com 1,6s de atraso — o usuário
 * chega rolando antes de o item aparecer.
 */
export function staggerDelay(index: number, step = 0.04, max = 8): number {
  return Math.min(index, max) * step;
}
