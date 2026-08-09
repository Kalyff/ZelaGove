import { useEffect } from 'react';

/** Quantos travamentos estão ativos. Dois modais abertos não podem destravar
 *  o scroll quando só o de cima fecha. */
let locks = 0;
let restore = '';
let restorePadding = '';

/**
 * Trava o scroll do body enquanto `active`.
 *
 * Compensa a largura da barra de rolagem com padding: sem isso, o conteúdo
 * atrás do modal salta alguns pixels para a direita no instante em que o modal
 * abre, e de volta quando fecha.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    if (locks === 0) {
      const body = document.body;
      const gap = window.innerWidth - document.documentElement.clientWidth;
      restore = body.style.overflow;
      restorePadding = body.style.paddingRight;
      body.style.overflow = 'hidden';
      if (gap > 0) body.style.paddingRight = `${gap}px`;
    }
    locks += 1;

    return () => {
      locks -= 1;
      if (locks === 0) {
        document.body.style.overflow = restore;
        document.body.style.paddingRight = restorePadding;
      }
    };
  }, [active]);
}
