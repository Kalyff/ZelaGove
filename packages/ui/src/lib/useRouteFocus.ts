import { useEffect, useRef, type RefObject } from 'react';

/**
 * Move o foco para o conteúdo principal quando a rota muda.
 *
 * Numa SPA, navegar não recarrega a página: o leitor de tela não anuncia nada e
 * o foco continua no link que foi clicado — que muitas vezes nem existe mais.
 * Focar o `<main>` (que precisa ter `tabIndex={-1}`) recria o comportamento que
 * a navegação com páginas de verdade dá de graça.
 *
 * Recebe a chave da rota por parâmetro em vez de chamar `useLocation`: assim o
 * design system não passa a depender do react-router.
 */
export function useRouteFocus(ref: RefObject<HTMLElement>, routeKey: string) {
  const first = useRef(true);

  useEffect(() => {
    /* Na primeira montagem o foco já está onde deveria. Roubá-lo aqui faria a
       página rolar para o topo do main e atrapalharia quem chegou por link
       direto com âncora. */
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.focus();
  }, [ref, routeKey]);
}
