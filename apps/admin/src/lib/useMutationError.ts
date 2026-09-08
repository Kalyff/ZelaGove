import { ApiError } from '@zeladoria/client';
import { useToast } from '@zeladoria/ui';
import { useCallback, useState } from 'react';

/**
 * Erro de mutação para uma tela do painel.
 *
 * Todas as telas de escrita repetiam o mesmo trio: guardar a mensagem, guardar
 * o `field` que o servidor apontou no 422, e disparar o toast. O `field` é o
 * que decide entre mostrar a mensagem NO campo ou num banner genérico — se ele
 * se perde, o operador lê "não foi possível concluir" sem saber onde está o
 * problema.
 */
export function useMutationError() {
  const toast = useToast();
  const [message, setMessage] = useState<string | null>(null);
  const [field, setField] = useState<string | null>(null);

  const clear = useCallback(() => {
    setMessage(null);
    setField(null);
  }, []);

  const capture = useCallback(
    (err: Error) => {
      setMessage(err.message);
      setField(err instanceof ApiError ? (err.field ?? null) : null);
      toast.error(err.message);
    },
    [toast],
  );

  /** `message` e `field` vão direto para os modais, que decidem entre mostrar a
   *  mensagem no campo apontado ou num banner. */
  return { message, field, capture, clear };
}
