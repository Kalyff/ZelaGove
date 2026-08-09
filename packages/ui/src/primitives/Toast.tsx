import { AnimatePresence, m } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { DUR, EASE } from '../lib/motion';
import { IconAlert, IconCheck, IconClose } from '../icons';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastValue | null>(null);

/* Erro fica mais tempo: a mensagem costuma ser mais longa e o usuário precisa
   ler o que fazer, não só saber que deu errado. */
const DURATION: Record<ToastTone, number> = { success: 3500, error: 6000, info: 4000 };

export type ToastDurations = Partial<Record<ToastTone, number>>;

const TONES: Record<ToastTone, { chip: string; Icon: typeof IconCheck }> = {
  success: { chip: 'text-success', Icon: IconCheck },
  error: { chip: 'text-danger-onSoft', Icon: IconAlert },
  info: { chip: 'text-accent', Icon: IconAlert },
};

/**
 * Toasts.
 *
 * Não roubam o foco: aparecem sem interromper quem está digitando.
 *
 * A pilha é a PRÓPRIA região `aria-live`, e não um bloco `aria-hidden` apoiado
 * no `AnnouncerProvider`. A primeira versão era aria-hidden para evitar anúncio
 * duplicado — mas isso também tirava o botão de dispensar da árvore de
 * acessibilidade: um controle interativo que existe na tela e não existe para
 * leitor de tela. Aqui a região anuncia e o botão continua alcançável.
 * Por isso: não chame `announce()` com a MESMA mensagem de um toast.
 */
export function ToastProvider({
  children,
  /** Sobrescreve os tempos. Existe para teste determinístico — e para app que
   *  precise de ritmo diferente sem bifurcar o componente. */
  durations,
}: {
  children: ReactNode;
  durations?: ToastDurations;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, tone, message }]);
      window.setTimeout(
        () => setToasts((list) => list.filter((t) => t.id !== id)),
        durations?.[tone] ?? DURATION[tone],
      );
    },
    [durations],
  );

  const value = useMemo<ToastValue>(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            role="region"
            aria-label="Avisos"
            aria-live="polite"
            className={cn(
              'pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2',
              // Acima da barra inferior no celular, e fora da área do gesto.
              'px-4 pb-[calc(1rem+var(--safe-b))] sm:bottom-auto sm:right-4 sm:top-4 sm:items-end sm:px-0 sm:pb-0',
            )}
          >
            <AnimatePresence initial={false}>
            {toasts.map(({ id, tone, message }) => {
              const { chip, Icon } = TONES[tone];
              return (
                <m.div
                  key={id}
                  /* Sem `layout` de propósito: essa prop exige o feature set
                     `domMax`, e o app do cidadão carrega o `domAnimation` para
                     caber no orçamento de bundle. Com `domAnimation` a prop
                     seria ignorada em silêncio, o que é pior que não a ter.
                     O custo é que avisos empilhados assentam sem deslizar —
                     situação rara, já que quase sempre há um só na tela. */
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: DUR.base, ease: EASE.out } }}
                  exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: DUR.fast, ease: EASE.in } }}
                  className={cn(
                    'pointer-events-auto flex w-full max-w-sm items-start gap-2.5',
                    'rounded-field border border-line bg-surface-raised px-4 py-3 shadow-panel',
                  )}
                >
                  <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', chip)} />
                  <p className="flex-1 text-sm leading-relaxed text-content">{message}</p>
                  <button
                    type="button"
                    onClick={() => setToasts((list) => list.filter((t) => t.id !== id))}
                    className="-m-1 shrink-0 cursor-pointer p-1 text-content-tertiary hover:text-content"
                  >
                    <IconClose className="h-4 w-4" />
                    <span className="sr-only">Fechar aviso</span>
                  </button>
                </m.div>
              );
            })}
            </AnimatePresence>
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

/** Fora do provider vira no-op: um aviso perdido não deve derrubar a tela. */
export function useToast(): ToastValue {
  return (
    useContext(ToastContext) ?? {
      success: () => {},
      error: () => {},
      info: () => {},
    }
  );
}
