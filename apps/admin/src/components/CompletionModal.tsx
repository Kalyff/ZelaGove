import { Button, ErrorState, Field, Modal, Textarea } from '@zeladoria/ui';
import { useEffect, useState } from 'react';
import type { TicketDTO } from '@zeladoria/shared';

/**
 * Requisito 3.2.7. Disparado tanto pelo drag-and-drop quanto pelo seletor de
 * status — a conclusão nunca acontece sem passar por aqui.
 *
 * O botão desabilitado enquanto a observação está vazia é conveniência: quem
 * recusa de verdade é o servidor (422 COMPLETION_NOTE_REQUIRED).
 */
export function CompletionModal({
  ticket,
  busy,
  error,
  /** Quando o servidor aponta o campo (`field: 'note'` no 422), a mensagem vai
   *  para o campo em vez de um banner genérico. */
  errorField,
  onCancel,
  onConfirm,
}: {
  ticket: TicketDTO | null;
  busy: boolean;
  error: string | null;
  errorField?: string | null;
  onCancel: () => void;
  onConfirm: (note: string, photo: File | null) => void;
}) {
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  /* Limpa ao trocar de ordem: sem isto, a observação escrita para um chamado
     reaparecia no seguinte. */
  useEffect(() => {
    if (ticket) return;
    setNote('');
    setPhoto(null);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }, [ticket]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pickPhoto(file: File | null) {
    setPhoto(file);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  return (
    <Modal
      open={!!ticket}
      onClose={onCancel}
      title="Concluir serviço"
      eyebrow={ticket?.title}
      /* Clique no fundo NÃO fecha: a observação é obrigatória e vai para a
         linha do tempo imutável. Perder o texto por um clique fora seria
         irrecuperável. O Escape continua fechando — ele é o par de teclado do
         botão Cancelar, e cancelar é uma escolha, não um acidente. */
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            variant="success"
            loading={busy}
            disabled={!note.trim()}
            onClick={() => onConfirm(note.trim(), photo)}
          >
            Confirmar conclusão
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Observações do serviço"
          required
          error={errorField === 'note' ? (error ?? undefined) : undefined}
          hint="O cidadão vê esta observação na linha do tempo do chamado."
        >
          {(p) => (
            <Textarea
              {...p}
              rows={4}
              /* Lido pelo useFocusTrap. O `autoFocus` do React não serve aqui:
                 ele não deixa atributo no DOM e o trap tem a última palavra. */
              data-autofocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Descreva o que foi feito..."
            />
          )}
        </Field>

        <div>
          <span className="field-label">Foto da conclusão (opcional)</span>
          <label className="block cursor-pointer overflow-hidden rounded-field border-2 border-dashed border-line-strong bg-surface-sunken text-center">
            {preview ? (
              <img
                src={preview}
                alt="Prévia da foto de conclusão"
                className="h-40 w-full object-cover"
              />
            ) : (
              <span className="flex h-24 items-center justify-center text-sm text-content-tertiary">
                Escolher imagem
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {/* Só banner quando o erro NÃO pertence a um campo — senão a mensagem
            apareceria duas vezes. */}
        {error && errorField !== 'note' && (
          <ErrorState title="Não foi possível concluir" description={error} />
        )}
      </div>
    </Modal>
  );
}
