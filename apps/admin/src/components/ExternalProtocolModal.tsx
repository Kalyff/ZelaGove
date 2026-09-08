import { Button, ErrorState, Field, Input, Modal, Textarea } from '@zeladoria/ui';
import { useEffect, useState } from 'react';
import type { TicketDTO } from '@zeladoria/shared';

/**
 * Anota o número que o órgão devolveu.
 *
 * Existe porque o protocolo externo quase nunca chega junto com o
 * encaminhamento — vem dias depois, por e-mail ou telefone. Exigi-lo no ato
 * obrigaria o operador a inventar um número ou a adiar o registro inteiro.
 *
 * Isto NÃO muda o status: o chamado segue encaminhado, só passou a ter um
 * número de acompanhamento. É um evento novo na linha do tempo, não uma edição
 * do anterior — o histórico é append-only, e reescrevê-lo apagaria de onde o
 * chamado veio.
 */
export function ExternalProtocolModal({
  ticket,
  busy,
  error,
  errorField,
  onCancel,
  onConfirm,
}: {
  ticket: TicketDTO | null;
  busy: boolean;
  error: string | null;
  errorField?: string | null;
  onCancel: () => void;
  onConfirm: (input: { externalProtocol: string; note?: string }) => void;
}) {
  const [protocol, setProtocol] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (ticket) return;
    setProtocol('');
    setNote('');
  }, [ticket]);

  return (
    <Modal
      open={!!ticket}
      onClose={onCancel}
      title="Anotar protocolo do órgão"
      eyebrow={ticket?.title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            loading={busy}
            disabled={!protocol.trim()}
            onClick={() =>
              onConfirm({ externalProtocol: protocol.trim(), note: note.trim() || undefined })
            }
          >
            Anotar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {ticket?.forwardedTo && (
          <p className="rounded-field bg-surface-sunken p-3.5 text-sm text-content-secondary">
            Encaminhado a <strong className="font-semibold text-content">{ticket.forwardedTo.name}</strong>.
            O status não muda — o chamado continua encaminhado.
          </p>
        )}

        <Field
          label="Protocolo do órgão"
          required
          error={errorField === 'externalProtocol' ? (error ?? undefined) : undefined}
          hint="Número que o órgão informou. O cidadão vê este número na linha do tempo."
        >
          {(p) => (
            <Input
              {...p}
              data-autofocus
              value={protocol}
              onChange={(e) => setProtocol(e.target.value)}
              placeholder="Ex.: SAN-2026-88213"
            />
          )}
        </Field>

        <Field
          label="Observação (opcional)"
          hint="Como o número chegou, prazo informado, com quem falou."
        >
          {(p) => (
            <Textarea
              {...p}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: protocolo informado por telefone, prazo de 15 dias."
            />
          )}
        </Field>

        {error && !errorField && (
          <ErrorState title="Não foi possível anotar" description={error} />
        )}
      </div>
    </Modal>
  );
}
