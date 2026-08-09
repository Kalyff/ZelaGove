import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { IconChevronDown } from '../icons';

/* 44px de altura mínima (`h-11`) e 16px de fonte no mobile. Fonte menor que
   16px faz o iOS dar zoom sozinho ao focar o campo, e a página nunca volta. */
const BASE =
  'w-full rounded-field border bg-surface px-4 text-content placeholder:text-content-tertiary ' +
  'transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-surface-sunken ' +
  'disabled:text-content-tertiary aria-[invalid=true]:border-danger';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(BASE, 'h-11 border-line-strong text-base focus:border-accent', className)}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(BASE, 'resize-none border-line-strong py-3 text-base focus:border-accent', className)}
        {...rest}
      />
    );
  },
);

/**
 * `<select>` nativo com seta própria.
 *
 * Mantém o elemento nativo (semântica, teclado e o seletor em roda do celular
 * vêm de graça) e só troca a aparência: a seta padrão do sistema não segue o
 * tema e é o vazamento nº 1 de dark mode em formulário.
 */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            BASE,
            'h-11 appearance-none border-line-strong pr-10 text-base focus:border-accent',
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <IconChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-tertiary"
        />
      </div>
    );
  },
);
