import { AnimatePresence, m } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';
import { DUR, EASE, fade } from '../lib/motion';
import { useFocusTrap } from '../lib/useFocusTrap';
import { useScrollLock } from '../lib/useScrollLock';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Nome acessível do painel — vira `aria-label`. */
  label: string;
  id?: string;
  side?: 'left' | 'right';
  className?: string;
  children: ReactNode;
}

/**
 * Painel lateral. Mesma maquinaria do `Modal` (portal, trap, Escape, scroll
 * lock), geometria diferente: é a gaveta de navegação do painel abaixo de `lg`.
 */
export function Sheet({
  open,
  onClose,
  label,
  id,
  side = 'left',
  className,
  children,
}: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useFocusTrap(panelRef, open);
  useScrollLock(open);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <m.div
            variants={fade}
            initial="hidden"
            animate="show"
            exit="exit"
            aria-hidden
            onClick={onClose}
            className="absolute inset-0 cursor-pointer bg-[var(--surface-overlay)] backdrop-blur-sm"
          />
          <m.div
            ref={panelRef}
            /* A variante vive aqui e não em motion.ts porque o eixo depende do
               lado: um `sheetLeft` fixo entraria pela esquerda mesmo no painel
               ancorado à direita. */
            initial={{ x: side === 'left' ? '-100%' : '100%' }}
            animate={{ x: 0, transition: { duration: DUR.slow, ease: EASE.out } }}
            exit={{
              x: side === 'left' ? '-100%' : '100%',
              transition: { duration: DUR.base, ease: EASE.in },
            }}
            id={id}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className={cn(
              'absolute inset-y-0 flex w-[17rem] max-w-[85vw] flex-col shadow-panel',
              side === 'left' ? 'left-0' : 'right-0',
              className,
            )}
          >
            {children}
          </m.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
