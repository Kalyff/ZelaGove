import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { fade, scaleIn } from '../lib/motion';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useScrollLock } from '../lib/useScrollLock';
import { IconClose } from '../icons';
import { IconButton } from './IconButton';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Texto pequeno ao lado do título (protocolo, contagem). */
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** `lg` para formulário, `xl` para o detalhe em duas colunas. */
  size?: 'md' | 'lg' | 'xl';
  /**
   * Clique no fundo fecha. Desligue em confirmação destrutiva — o
   * `CompletionModal` grava observação obrigatória na linha do tempo, e perder
   * o texto digitado por um clique fora é irrecuperável.
   * O Escape continua funcionando: ele é o par de teclado do botão Cancelar,
   * não do "descartar sem querer".
   */
  dismissOnBackdrop?: boolean;
}

const SIZES = {
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const;

export function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  size = 'md',
  dismissOnBackdrop = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useFocusTrap(panelRef, open);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return createPortal(
    /* A condição fica DENTRO do AnimatePresence: ele precisa do nó ainda
       montado para animar a saída. Um `return null` acima mataria o exit. */
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Fundo `aria-hidden` e não focável: o caminho de teclado para
              fechar é o Escape e o botão X, não um div clicável sem semântica. */}
          <m.div
            variants={fade}
            initial="hidden"
            animate="show"
            exit="exit"
            aria-hidden
            onClick={dismissOnBackdrop ? onClose : undefined}
            className={cn(
              'absolute inset-0 bg-[var(--surface-overlay)] backdrop-blur-sm',
              dismissOnBackdrop && 'cursor-pointer',
            )}
          />

          <m.div
            ref={panelRef}
            variants={scaleIn}
            initial="hidden"
            animate="show"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              'relative flex max-h-[86dvh] w-full flex-col overflow-hidden',
              'rounded-card border border-line bg-surface-raised shadow-panel',
              SIZES[size],
            )}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id={titleId} className="font-display text-lg font-extrabold text-content">
                  {title}
                </h2>
                {eyebrow && (
                  <p className="mt-0.5 font-mono text-xs text-content-tertiary">{eyebrow}</p>
                )}
              </div>
              <IconButton label="Fechar" onClick={onClose}>
                <IconClose />
              </IconButton>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

            {footer && (
              <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-line px-5 py-4 sm:px-6">
                {footer}
              </footer>
            )}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
