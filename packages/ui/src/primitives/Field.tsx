import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface FieldProps {
  label: string;
  /** Texto de apoio permanente. Placeholder some quando se digita; isto não. */
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  /** Recebe os ids/atributos já ligados — o campo não precisa saber de a11y. */
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
    required: boolean | undefined;
  }) => ReactNode;
}

/**
 * Rótulo + controle + apoio + erro, com `aria-describedby` e `aria-invalid`
 * ligados corretamente.
 *
 * O slot de erro reserva altura fixa (`min-h-[1.25rem]`): sem isso, o erro
 * aparecendo empurra o resto do formulário para baixo e o botão foge de debaixo
 * do dedo no instante em que o usuário vai tocar de novo.
 */
export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block font-display text-xs font-bold uppercase tracking-[0.12em] text-content-secondary">
        {label}
        {required && (
          <>
            {' '}
            <span className="text-danger-onSoft" aria-hidden>
              *
            </span>
            <span className="sr-only">(obrigatório)</span>
          </>
        )}
      </label>

      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        required: required || undefined,
      })}

      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-content-tertiary">
          {hint}
        </p>
      )}

      <div className={cn('min-h-[1.25rem]', !error && 'sr-only')}>
        {error && (
          <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-danger-onSoft">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
