import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Vira `aria-label` e `title`. Obrigatório: botão só com ícone sem nome
   *  acessível é um botão sem nome nenhum para quem usa leitor de tela. */
  label: string;
  children: ReactNode;
  variant?: 'ghost' | 'solid';
  /** Sobre chrome escuro (sidebar, capa) o contraste vem do par `chrome`. */
  onChrome?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, variant = 'ghost', onChrome = false, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        /* 44x44 é o mínimo de alvo de toque. O ícone dentro costuma ter 16-20px;
           é o botão que carrega a área, não o desenho. */
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
        'cursor-pointer touch-manipulation transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:saturate-50',
        variant === 'solid'
          ? 'bg-surface-sunken text-content hover:bg-line'
          : onChrome
            ? 'text-chrome-secondary hover:bg-white/10 hover:text-chrome'
            : 'text-content-tertiary hover:bg-surface-sunken hover:text-content',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
