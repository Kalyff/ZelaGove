import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface IconProps {
  className?: string;
  /** Necessário no painel: a cor do ícone da coluna vem de `STATUS_HEX`. */
  style?: CSSProperties;
}

/**
 * Peso de traço único para todo o conjunto.
 *
 * Os dois `icons.tsx` de antes misturavam 1.6, 2 e 2.5 — dois ícones lado a
 * lado tinham densidades diferentes, que é o tipo de inconsistência que faz a
 * interface parecer amadora sem que se saiba apontar por quê.
 */
const STROKE = 1.75;

/**
 * Fábrica de ícones.
 *
 * O `className` do chamador é MESCLADO com o padrão via `cn`, não o substitui:
 * nos componentes antigos, passar `className="h-6 w-6"` apagava o `h-5 w-5`
 * embutido por coincidência de ordem, não por decisão.
 */
export function createIcon(displayName: string, children: ReactNode, strokeWidth = STROKE) {
  function Icon({ className, style }: IconProps) {
    return (
      <svg
        className={cn('h-5 w-5 shrink-0', className)}
        style={style}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        focusable="false"
      >
        {children}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}
