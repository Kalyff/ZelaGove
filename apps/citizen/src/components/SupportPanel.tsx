import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@zeladoria/client';
import {
  acceptsSupport,
  supportLabel,
  type CitizenTicketDetailDTO,
} from '@zeladoria/shared';
import { Button, IconCheck, IconEye, useToast } from '@zeladoria/ui';
import { supportTicket, withdrawSupport } from '../lib/api';

/**
 * "Eu também vi isso": confirmar o chamado de outra pessoa em vez de abrir um
 * duplicado. Para a prefeitura, vinte avisos do mesmo buraco viram um chamado
 * com vinte apoios — prioridade em vez de fila.
 *
 * O botão só aparece para quem pode apoiar: não no próprio chamado (a lista
 * "Na cidade" esconde os seus, mas o autor ainda abre o detalhe pelo link que
 * compartilhou) e não no concluído. A contagem aparece para
 * todos, inclusive para o autor — é o retorno de que outras pessoas também
 * foram afetadas.
 */
export function SupportPanel({
  ticket,
  queryKey,
}: {
  ticket: CitizenTicketDetailDTO;
  /** Chave do detalhe no cache, para redesenhar sem buscar tudo de novo. */
  queryKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: (support: boolean) =>
      support ? supportTicket(ticket.id) : withdrawSupport(ticket.id),
    onSuccess: (result, support) => {
      queryClient.setQueryData<CitizenTicketDetailDTO>(queryKey, (old) =>
        old ? { ...old, ...result } : old,
      );
      toast.success(
        support
          ? 'Apoio registrado. A prefeitura vê que mais gente tem este problema.'
          : 'Apoio retirado.',
      );
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Não foi possível registrar o apoio.');
      /* A recusa mais provável é o chamado ter sido concluído desde que a tela
         abriu: buscar de novo mostra o estado real e tira o botão. */
      queryClient.invalidateQueries({ queryKey });
    },
    // A contagem também aparece nos cartões da lista "Na cidade".
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['public-tickets'] }),
  });

  const canSupport = !ticket.isMine && acceptsSupport(ticket.status);
  if (!canSupport && ticket.supportCount === 0) return null;

  const count =
    ticket.supportCount > 0 ? (
      <p className="flex items-center gap-2 text-sm font-medium text-content-secondary">
        <IconEye className="h-4 w-4 shrink-0 text-accent" />
        {supportLabel(ticket.supportCount)} este problema
      </p>
    ) : null;

  if (!canSupport) return count;

  return (
    <section className="space-y-3 rounded-card border border-line p-4">
      {count}
      {/* Um botão só, com `aria-pressed`, em vez de trocar "apoiar" por
          "desfazer": trocar o elemento derrubaria o foco de quem usa teclado
          ou leitor de tela no meio da ação. O rótulo fica fixo; o estado é o
          `pressed`. */}
      <Button
        variant={ticket.supportedByMe ? 'success' : 'secondary'}
        fullWidth
        aria-pressed={ticket.supportedByMe}
        loading={mutation.isPending}
        iconLeft={
          ticket.supportedByMe ? <IconCheck className="h-4 w-4" /> : <IconEye className="h-4 w-4" />
        }
        onClick={() => mutation.mutate(!ticket.supportedByMe)}
      >
        Eu também vi isso
      </Button>
      <p className="text-xs leading-relaxed text-content-tertiary">
        {ticket.supportedByMe
          ? 'Você confirmou este problema. Toque de novo para desfazer.'
          : 'Em vez de abrir outro chamado, confirme este: a prefeitura vê quantas pessoas têm o mesmo problema.'}
      </p>
    </section>
  );
}
