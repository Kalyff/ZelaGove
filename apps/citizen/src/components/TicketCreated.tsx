import {
  Button,
  IconCheck,
  IconCopy,
  useAnnouncer,
  useReducedMotionSafe,
  useToast,
} from '@zeladoria/ui';
import { m } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TicketDTO } from '@zeladoria/shared';

/**
 * Confirmação de abertura.
 *
 * Antes o fluxo terminava num `navigate` seco: o chamado era criado, o
 * protocolo era gerado no servidor — e o cidadão nunca o via. Protocolo é o
 * que ele usa para cobrar depois; esconder é perder o produto do serviço.
 */
export function TicketCreated({ ticket }: { ticket: TicketDTO }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { announce } = useAnnouncer();
  const reduced = useReducedMotionSafe();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    announce(`Chamado aberto. Protocolo ${ticket.protocol}.`, 'assertive');
    headingRef.current?.focus();
  }, [ticket.protocol, announce]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(ticket.protocol);
      toast.success('Protocolo copiado.');
    } catch {
      // Sem clipboard (contexto inseguro, permissão negada): o número está na
      // tela e pode ser copiado à mão. Não vale derrubar nada por isso.
      toast.info('Anote o protocolo: ' + ticket.protocol);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center px-7 py-10 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
        {reduced ? (
          <IconCheck className="h-8 w-8 text-success-onSoft" />
        ) : (
          <m.svg
            className="h-8 w-8 text-success-onSoft"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            {/* O traço se desenha, em vez de simplesmente aparecer: o gesto de
                "marcar concluído" é o que a tela está comunicando. */}
            <m.path
              d="m4.5 12.5 5 5 10-11"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.42, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            />
          </m.svg>
        )}
      </div>

      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 font-display text-2xl font-extrabold text-content focus:outline-none"
      >
        Chamado aberto
      </h1>
      <p className="mt-1.5 text-sm text-content-secondary">
        Guarde o protocolo para acompanhar ou cobrar o andamento.
      </p>

      <div className="mt-6 rounded-card border border-line bg-surface-sunken px-5 py-4">
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-content-tertiary">
          Protocolo
        </p>
        {/* `tabular-nums` para o número não dançar entre dígitos. */}
        <p className="mt-1 font-mono text-2xl font-medium tabular-nums text-content">
          {ticket.protocol}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={copy}
          iconLeft={<IconCopy className="h-4 w-4" />}
        >
          Copiar protocolo
        </Button>
      </div>

      <p className="mt-5 text-sm text-content-secondary">
        <span className="font-semibold text-content">{ticket.title}</span>
        <br />
        {ticket.categoryLabel}
      </p>

      <div className="mt-7 space-y-3">
        <Button
          size="lg"
          fullWidth
          onClick={() => navigate(`/chamados/${ticket.id}`, { replace: true })}
        >
          Acompanhar chamado
        </Button>
        <Button
          variant="ghost"
          size="lg"
          fullWidth
          onClick={() => navigate('/chamados', { replace: true })}
        >
          Voltar aos meus chamados
        </Button>
      </div>
    </div>
  );
}
