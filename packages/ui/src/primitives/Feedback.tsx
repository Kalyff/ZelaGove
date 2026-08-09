import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { IconAlert, IconRefresh, type IconProps } from '../icons';
import { Button } from './Button';

/* -------------------------------------------------------------------------
 * Skeleton
 * ---------------------------------------------------------------------- */

/**
 * Placeholder com a GEOMETRIA do conteúdo real, não um retângulo genérico.
 *
 * O ganho do skeleton sobre o spinner é a promessa de layout: o usuário já
 * entende a forma do que vem antes de o dado chegar, e nada salta quando ele
 * chega. Um skeleton que não bate com o resultado é só um spinner caro.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-md bg-surface-sunken',
        // O brilho é um pseudo-elemento animado em transform; animar
        // background-position causaria repaint a cada frame.
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-black/[0.06] after:to-transparent',
        'dark:after:via-white/[0.07]',
        className,
      )}
    />
  );
}

/** Linha de texto. `w` controla a largura para o bloco não parecer um tijolo. */
export function SkeletonText({ className }: { className?: string }) {
  return <Skeleton className={cn('h-3.5 rounded', className)} />;
}

/* -------------------------------------------------------------------------
 * Spinner
 * ---------------------------------------------------------------------- */

/** Só para espera curta (<1s) ou dentro de botão. Acima disso, use Skeleton. */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <svg
        className={cn('h-4 w-4 shrink-0 animate-spin', className)}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      {label && <span className="text-sm text-content-secondary">{label}</span>}
    </span>
  );
}

/* -------------------------------------------------------------------------
 * EmptyState / ErrorState
 * ---------------------------------------------------------------------- */

export function EmptyState({
  Icon,
  title,
  description,
  action,
  className,
}: {
  Icon: (props: IconProps) => ReactNode;
  title: string;
  description?: string;
  /** Vazio sem saída é beco. Sempre ofereça o próximo passo quando existir. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      {/* `content-decor` reprova contraste de texto de propósito — é gráfico
          decorativo, não informação. O que informa está no título. */}
      <Icon className="h-12 w-12 text-content-decor" />
      <p className="font-display font-bold text-content-secondary">{title}</p>
      {description && (
        <p className="max-w-[18rem] text-sm leading-relaxed text-content-tertiary">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Não foi possível carregar',
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-3 rounded-card border border-line bg-danger-soft px-5 py-4',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger-onSoft" />
        <div>
          <p className="font-display font-bold text-danger-onSoft">{title}</p>
          {description && (
            <p className="mt-0.5 text-sm leading-relaxed text-danger-onSoft/90">{description}</p>
          )}
        </div>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} iconLeft={<IconRefresh className="h-4 w-4" />}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}
