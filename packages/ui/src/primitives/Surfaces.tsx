import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';

/* -------------------------------------------------------------------------
 * Card
 * ---------------------------------------------------------------------- */

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Liga hover e cursor. Use quando o card inteiro é clicável/arrastável. */
  interactive?: boolean;
}

export function Card({ interactive = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-card border border-line bg-surface-raised shadow-card',
        interactive &&
          'cursor-pointer transition-colors duration-150 hover:border-line-strong hover:bg-surface-sunken',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Badge
 * ---------------------------------------------------------------------- */

export function Badge({
  children,
  className,
  Icon,
}: {
  children: ReactNode;
  className?: string;
  Icon?: (props: { className?: string }) => ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'font-display text-[11px] font-bold uppercase tracking-[0.08em]',
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * SkipLink / VisuallyHidden
 * ---------------------------------------------------------------------- */

/**
 * Primeiro elemento focável da página. Fica escondido até receber foco.
 *
 * Sem ele, quem navega por teclado atravessa toda a navegação em cada página
 * antes de chegar ao conteúdo.
 */
export function SkipLink({ href = '#conteudo' }: { href?: string }) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only',
        'focus:fixed focus:left-4 focus:top-4 focus:z-[200]',
        'focus:rounded-field focus:bg-accent focus:px-4 focus:py-2.5',
        'focus:font-display focus:text-sm focus:font-bold focus:text-accent-on',
      )}
    >
      Pular para o conteúdo
    </a>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}
