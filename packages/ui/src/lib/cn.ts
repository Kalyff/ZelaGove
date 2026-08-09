import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Junta classes condicionais resolvendo conflito do Tailwind: a última vence.
 *
 * O `twMerge` custa ~6,5 kB gzip e paga esse preço porque o `clsx` sozinho não
 * resolve o conflito — e o modo como ele falha é silencioso. O Tailwind ordena
 * a folha gerada pela sua própria escala, não pela ordem do atributo `class`,
 * então `clsx('h-5 w-5', 'h-4 w-4')` renderiza em `h-5`: quem chamou pediu 4 e
 * recebeu 5, sem aviso. Era esse o bug dos dois `icons.tsx` antigos.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
