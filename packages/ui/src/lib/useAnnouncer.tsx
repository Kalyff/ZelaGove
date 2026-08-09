import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Politeness = 'polite' | 'assertive';

interface AnnouncerValue {
  /** `polite` espera o leitor terminar a frase atual; `assertive` interrompe.
   *  Use assertive só para o que muda o estado da tarefa (chamado criado). */
  announce: (message: string, politeness?: Politeness) => void;
}

const AnnouncerContext = createContext<AnnouncerValue | null>(null);

/**
 * Região `aria-live` única por app.
 *
 * Hoje nenhuma mudança assíncrona é anunciada: a lista termina de carregar, o
 * card muda de coluna, a busca filtra — e para quem usa leitor de tela nada
 * disso aconteceu. As duas regiões ficam sempre no DOM (montá-las junto com a
 * mensagem faz o leitor ignorar o conteúdo).
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    const set = politeness === 'assertive' ? setAssertive : setPolite;
    /* Limpa antes de escrever: repetir a mesma string não dispara o anúncio,
       porque o valor do nó não mudou. */
    set('');
    window.setTimeout(() => set(message), 60);
  }, []);

  const value = useMemo(() => ({ announce }), [announce]);

  return (
    <AnnouncerContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {polite}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertive}
      </div>
    </AnnouncerContext.Provider>
  );
}

/** Fora do provider vira no-op em vez de lançar: um anúncio que não sai é
 *  degradação; uma tela que quebra por causa dele, não. */
export function useAnnouncer(): AnnouncerValue {
  return useContext(AnnouncerContext) ?? { announce: () => {} };
}
