import { useEffect, type RefObject } from 'react';

/**
 * Seletor do que é focável. `[tabindex="-1"]` fica de fora de propósito: esses
 * elementos são alvo programático de foco (como o `<main>` na troca de rota),
 * não paradas do Tab.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0,
  );
}

/**
 * Prende o Tab dentro do container enquanto `active`, e devolve o foco a quem
 * abriu ao desmontar.
 *
 * Sem isto, o Tab dentro de um modal continua andando pela página atrás dele:
 * quem navega por teclado ou leitor de tela sai do diálogo sem perceber e passa
 * a operar controles que estão visualmente cobertos.
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;

    /* Guardado ANTES de mover o foco, senão devolveríamos para dentro do
       próprio modal quando ele fechar. */
    const previous = document.activeElement as HTMLElement | null;

    /* `data-autofocus` tem prioridade sobre o primeiro focável.
       Sem isto o foco cai sempre no botão Fechar do cabeçalho — o que num
       modal de formulário significa abrir o diálogo com o cursor no botão de
       desistir, em vez de no campo que precisa ser preenchido.

       É `data-autofocus`, e não o `autoFocus` do React: o React aplica aquele
       chamando `.focus()` na montagem e NÃO deixa o atributo no DOM, então
       `querySelector('[autofocus]')` nunca encontra nada. */
    const preferred = root.querySelector<HTMLElement>('[data-autofocus]');
    const first = preferred ?? focusable(root)[0];
    (first ?? root).focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || !root) return;
      const items = focusable(root);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === firstItem || current === root)) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && current === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      /* `isConnected`: se quem abriu saiu do DOM junto com o fechamento, focar
         nele lançaria ou jogaria o foco para o body sem aviso. */
      if (previous?.isConnected) previous.focus();
    };
  }, [ref, active]);
}
