import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Classes literais em mapa de lookup — nunca `` `bg-${tone}` ``.
 * O Tailwind varre o código como texto: classe montada em runtime não existe
 * no CSS gerado, e a falha é silenciosa.
 */
/**
 * O estado desabilitado é POR VARIANTE, e não só o `saturate-50` da base.
 *
 * Dessaturar não faz nada em `secondary` e `ghost`: elas não têm saturação —
 * são borda, superfície e texto neutro. O resultado era um botão desabilitado
 * pixel a pixel idêntico ao habilitado; descoberto no rodapé de paginação, onde
 * "Próxima" na última página continuava parecendo clicável.
 *
 * Também é preciso desligar o `hover:` explicitamente: `:hover` casa em botão
 * desabilitado, então sem isto ele ainda acende sob o cursor.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-on hover:bg-accent-hover',
  secondary:
    'border border-line-strong bg-surface text-content hover:bg-surface-sunken ' +
    'disabled:border-line disabled:bg-surface disabled:text-content-tertiary ' +
    'disabled:hover:bg-surface',
  ghost:
    'text-content-secondary hover:bg-surface-sunken hover:text-content ' +
    'disabled:text-content-tertiary disabled:hover:bg-transparent ' +
    'disabled:hover:text-content-tertiary',
  /* Verde fica na rung 600 nos dois temas: subir para a 400 no escuro deixaria
     um botão neon competindo com a ação primária, que é azul. */
  success: 'bg-gov-green-600 text-white hover:bg-gov-green-700',
  /* `danger-on`, não `text-white`: no escuro `--danger` é um salmão claro e
     branco em cima dele fica em 2,9:1. */
  danger: 'bg-danger text-danger-on hover:bg-gov-red-600 dark:hover:bg-gov-red-200',
};

/**
 * `md` é 44px de altura — o mínimo de alvo de toque. `sm` fica abaixo disso e
 * só deve aparecer em superfície densa de desktop (barra de ferramentas do
 * painel), nunca no app do cidadão.
 */
const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3 text-sm',
  md: 'h-11 gap-2 px-4 text-[15px]',
  lg: 'h-12 gap-2 px-5 text-base',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Mostra spinner, marca `aria-busy` e bloqueia o clique — sem trocar o rótulo. */
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    iconLeft,
    iconRight,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-field',
        'font-display font-bold leading-none transition-colors duration-150',
        'cursor-pointer touch-manipulation',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        /* Desabilitado dessatura e muda o cursor em vez de baixar a opacidade.
           `opacity-50` num botão colorido derruba o contraste do rótulo abaixo
           de 4,5:1 — o estado vira ilegível justamente quando o usuário está
           tentando entender por que não pode clicar. */
        'disabled:cursor-not-allowed disabled:saturate-50',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
});

/** Spinner inline do botão. O primitivo `Spinner` autônomo chega na Fase 3. */
function Spinner() {
  return (
    <svg
      className="h-4 w-4 shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
