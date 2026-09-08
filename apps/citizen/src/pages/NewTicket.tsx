import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CATEGORY_LABELS,
  TICKET_CATEGORIES,
  coords,
  type TicketCategory,
  type TicketDTO,
} from '@zeladoria/shared';
import {
  Button,
  ErrorState,
  Field,
  IconBack,
  IconButton,
  IconPin,
  Input,
  Select,
  Spinner,
  Textarea,
} from '@zeladoria/ui';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhotoUpload } from '../components/PhotoUpload';
import { TicketCreated } from '../components/TicketCreated';
import { ApiError } from '@zeladoria/client';
import { createTicket } from '../lib/api';
import { useGeolocation } from '../hooks/useGeolocation';

/** Campos que o servidor pode devolver em `ApiError.field` para esta tela. */
type FieldKey = 'title' | 'description' | 'category' | 'latitude' | 'longitude' | 'photo';

export default function NewTicket() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const geo = useGeolocation();

  const [photo, setPhoto] = useState<File | null>(null);
  const [category, setCategory] = useState<TicketCategory>('paving');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [created, setCreated] = useState<TicketDTO | null>(null);

  /* Refs em vez de `getElementById`: o `Field` gera o `id` internamente para
     casar `<label for>` com o controle. Fixar um id por fora quebraria essa
     associação — o rótulo apontaria para um elemento que não existe. */
  const titleRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const FOCUS_TARGETS: Partial<Record<FieldKey, { current: HTMLElement | null }>> = {
    title: titleRef,
    description: descriptionRef,
  };

  const mutation = useMutation({
    mutationFn: createTicket,
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
      /* Sem `navigate` aqui: o protocolo precisa ser mostrado antes de sair
         da tela. Quem navega são os botões da confirmação. */
      setCreated(ticket);
    },
    onError: (err: Error) => {
      if (err instanceof ApiError && err.field) {
        const key = err.field as FieldKey;
        setFieldErrors({ [key]: err.message });
        /* Leva o foco ao campo inválido, senão o usuário fica olhando um
           formulário longo sem saber onde está o problema. */
        FOCUS_TARGETS[key]?.current?.focus();
        return;
      }
      setFormError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Coordenada é obrigatória (requisito 4.3) e não há valor padrão razoável:
    // chutar o centro da cidade produziria um ponto errado no mapa do gestor.
    if (!geo.position) {
      setFormError('Capture a localização antes de enviar.');
      return;
    }

    const form = new FormData();
    form.append('title', title);
    form.append('description', description);
    form.append('category', category);
    form.append('latitude', String(geo.position.latitude));
    form.append('longitude', String(geo.position.longitude));
    if (photo) form.append('photo', photo);

    mutation.mutate(form);
  }

  if (created) return <TicketCreated ticket={created} />;

  return (
    <>
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-3">
        <IconButton label="Voltar" onClick={() => navigate(-1)}>
          <IconBack />
        </IconButton>
        <h1 className="font-display text-lg font-extrabold text-content">Novo serviço</h1>
      </header>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6"
      >
        <PhotoUpload onChange={setPhoto} error={fieldErrors.photo} />

        <div>
          <span className="mb-1.5 block font-display text-xs font-bold uppercase tracking-[0.12em] text-content-secondary">
            Localização <span className="text-danger-onSoft">*</span>
          </span>
          <div className="rounded-card border border-line bg-surface-sunken p-4">
            {geo.position ? (
              <>
                <p className="flex items-center gap-2 text-sm text-content">
                  <IconPin className="h-4 w-4 shrink-0 text-accent" />
                  {/* "Precisão ~12 m" diz ao usuário se o ponto está bom.
                      "-9.974990, -67.824300" não diz nada a ele — fica no
                      detalhe, para quem quiser conferir. */}
                  Localização capturada
                  <span className="text-content-tertiary">
                    (precisão ~{Math.round(geo.position.accuracy)} m)
                  </span>
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-content-tertiary">
                    Ver coordenadas
                  </summary>
                  <p className="mt-1 font-mono text-xs text-content-tertiary">
                    {coords(geo.position.latitude, geo.position.longitude)}
                  </p>
                </details>
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-content-secondary">
                <IconPin className="h-4 w-4 shrink-0 text-content-tertiary" />
                Sem localização
              </p>
            )}

            {geo.error && (
              <p role="alert" className="mt-2 text-xs font-medium text-danger-onSoft">
                {geo.error}
              </p>
            )}

            <Button
              variant="secondary"
              fullWidth
              className="mt-3"
              onClick={geo.capture}
              disabled={geo.loading}
            >
              {geo.loading ? (
                /* O timeout do GPS é 15s. Sem o contador, a espera é
                   indistinguível de travamento. */
                <Spinner label={`Buscando GPS... ${geo.elapsed}s`} />
              ) : geo.position ? (
                'Atualizar localização'
              ) : (
                'Usar minha localização'
              )}
            </Button>
          </div>
        </div>

        <Field label="Categoria" error={fieldErrors.category}>
          {(p) => (
            <Select
              {...p}
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
            >
              {TICKET_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="O que aconteceu?"
          required
          error={fieldErrors.title}
          hint="Um título curto ajuda a equipe a triar mais rápido."
        >
          {(p) => (
            <Input
              {...p}
              ref={titleRef}
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Buraco na via"
            />
          )}
        </Field>

        <Field label="Detalhes adicionais" required error={fieldErrors.description}>
          {(p) => (
            <Textarea
              {...p}
              ref={descriptionRef}
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Há quanto tempo está assim? Alguém já se machucou?"
            />
          )}
        </Field>

        {formError && <ErrorState title="Não foi possível enviar" description={formError} />}

        <Button
          type="submit"
          variant="success"
          size="lg"
          fullWidth
          loading={mutation.isPending}
        >
          Enviar chamado
        </Button>
      </form>
    </>
  );
}
