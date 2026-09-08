import { useQuery } from '@tanstack/react-query';
import {
  AGENCY_KIND_LABELS,
  CATEGORY_LABELS,
  SUGGESTED_AGENCY_KINDS,
  type AgencyDTO,
  type AgencyKind,
  type TicketDTO,
} from '@zeladoria/shared';
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  IconExternal,
  IconInbox,
  Input,
  Modal,
  Select,
  Skeleton,
  Textarea,
} from '@zeladoria/ui';
import { useEffect, useState } from 'react';
import { listAgencies } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

/**
 * Encaminhamento a órgão externo — espelha o `CompletionModal`, com uma
 * diferença de fundo: concluir é um fato sobre o serviço, encaminhar é um fato
 * sobre COMPETÊNCIA, e o cidadão vai ler a justificativa como explicação de por
 * que a prefeitura não fez.
 *
 * Três regras que a interface precisa carregar:
 *
 * 1. O sistema NÃO entrega nada ao órgão. Isso está escrito na tela, não só
 *    neste comentário — um operador que ache que o e-mail saiu sozinho deixa o
 *    chamado morrer parecendo atendido.
 * 2. A sugestão por categoria destaca, e não pré-seleciona. Categoria não
 *    determina competência: buraco na via pode ser da prefeitura, do DNIT ou do
 *    DER, e um valor já escolhido vira o caminho de menor esforço.
 * 3. O protocolo do órgão é opcional. Ele quase nunca existe agora — chega dias
 *    depois, e há uma ação própria para anotá-lo.
 */
export function ForwardModal({
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
  onConfirm: (input: { agencyId: string; note: string; externalProtocol?: string }) => void;
}) {
  const [agencyId, setAgencyId] = useState('');
  const [note, setNote] = useState('');
  const [protocol, setProtocol] = useState('');

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.agencies,
    queryFn: listAgencies,
    /* Só busca quando o modal abre: a lista de órgãos não interessa a mais
       ninguém no painel. */
    enabled: !!ticket,
    staleTime: 5 * 60_000,
  });

  /* Limpa ao fechar — sem isto a justificativa escrita para um chamado
     reaparece no seguinte, e é a última coisa que se quer num campo que vira
     registro público imutável. */
  useEffect(() => {
    if (ticket) return;
    setAgencyId('');
    setNote('');
    setProtocol('');
  }, [ticket]);

  const agencies = data?.data ?? [];

  const suggestedKinds: AgencyKind[] = ticket ? SUGGESTED_AGENCY_KINDS[ticket.category] : [];
  const isSuggested = (a: AgencyDTO) => suggestedKinds.includes(a.kind);
  const suggested = agencies.filter(isSuggested);
  const others = agencies.filter((a) => !isSuggested(a));

  const selected = agencies.find((a) => a.id === agencyId) ?? null;

  return (
    <Modal
      open={!!ticket}
      onClose={onCancel}
      title="Encaminhar a outro órgão"
      eyebrow={ticket?.title}
      /* Mesma razão do modal de conclusão: a justificativa é obrigatória e vai
         para a linha do tempo imutável. Perdê-la por um clique fora seria
         irrecuperável. Escape continua fechando. */
      dismissOnBackdrop={false}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            loading={busy}
            disabled={!agencyId || note.trim().length < 5 || agencies.length === 0}
            onClick={() =>
              onConfirm({
                agencyId,
                note: note.trim(),
                externalProtocol: protocol.trim() || undefined,
              })
            }
          >
            Registrar encaminhamento
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/*
          O aviso mais importante da tela, e por isso não é um `hint` discreto.
          O sistema registra; quem encaminha é a pessoa, pelo canal do órgão.
        */}
        {/* `border-warn`, sem modificador de opacidade: as cores semânticas são
            `var(--…)` com hex dentro, e o Tailwind DESCARTA a classe em silêncio
            quando se escreve `border-warn/40` — some a borda inteira. */}
        <p className="flex gap-3 rounded-field border border-warn bg-warn-soft p-3.5 text-sm leading-relaxed text-warn-onSoft">
          <IconExternal className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            O sistema <strong className="font-bold">registra</strong> o encaminhamento e informa o
            cidadão — mas não envia nada ao órgão. O contato pelo canal do órgão continua sendo
            feito por você.
          </span>
        </p>

        {isLoading && <Skeleton className="h-11 w-full rounded-field" />}

        {isError && (
          <ErrorState
            title="Não foi possível carregar os órgãos"
            description="Sem a lista de órgãos não há como encaminhar."
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && agencies.length === 0 && (
          <EmptyState
            Icon={IconInbox}
            title="Nenhum órgão cadastrado."
            description="Cadastre os órgãos competentes antes de encaminhar chamados."
          />
        )}

        {agencies.length > 0 && (
          <>
            <Field
              label="Órgão responsável"
              required
              error={errorField === 'agencyId' ? (error ?? undefined) : undefined}
              hint={
                suggestedKinds.length > 0 && ticket ? (
                  <>
                    Chamados de <strong>{CATEGORY_LABELS[ticket.category]}</strong> costumam ser de{' '}
                    {suggestedKinds.map((k) => AGENCY_KIND_LABELS[k].toLowerCase()).join(' ou ')} —
                    confira antes de encaminhar. A competência é do organograma, não da categoria.
                  </>
                ) : (
                  'Escolha o órgão que de fato responde por este serviço.'
                )
              }
            >
              {(p) => (
                <Select
                  {...p}
                  data-autofocus
                  value={agencyId}
                  onChange={(e) => setAgencyId(e.target.value)}
                >
                  {/* Sem pré-seleção: o operador escolhe, sempre. */}
                  <option value="">Selecione o órgão…</option>
                  {suggested.length > 0 && (
                    <optgroup label="Sugeridos para esta categoria">
                      {suggested.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} · {AGENCY_KIND_LABELS[a.kind]}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={suggested.length > 0 ? 'Demais órgãos' : 'Órgãos'}>
                    {others.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} · {AGENCY_KIND_LABELS[a.kind]}
                      </option>
                    ))}
                  </optgroup>
                </Select>
              )}
            </Field>

            {/* O que o cidadão vai receber como caminho de acompanhamento.
                Mostrado aqui porque um órgão sem contato público deixa o
                chamado num beco sem saída — e isso precisa ser visível ANTES
                de confirmar, não depois. */}
            {selected && (
              <div className="rounded-field bg-surface-sunken p-3.5">
                <p className="field-label">O cidadão verá</p>
                <p className="text-sm font-medium text-content">{selected.name}</p>
                {selected.publicPhone || selected.publicUrl ? (
                  <p className="mt-0.5 break-words font-mono text-xs text-content-secondary">
                    {[selected.publicPhone, selected.publicUrl].filter(Boolean).join(' · ')}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-warn-onSoft">
                    Este órgão não tem contato público cadastrado — o cidadão ficará sem onde
                    acompanhar.
                  </p>
                )}
                {selected.publicNote && (
                  <p className="mt-1.5 text-xs leading-relaxed text-content-secondary">
                    {selected.publicNote}
                  </p>
                )}
              </div>
            )}

            <Field
              label="Justificativa"
              required
              error={errorField === 'note' ? (error ?? undefined) : undefined}
              hint="O cidadão lê este texto na linha do tempo. Diga de quem é a competência, não apenas que não é da prefeitura."
            >
              {(p) => (
                <Textarea
                  {...p}
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex.: o poste fica na rede de distribuição da concessionária, fora da iluminação pública municipal."
                />
              )}
            </Field>

            <Field
              label="Protocolo do órgão (opcional)"
              error={errorField === 'externalProtocol' ? (error ?? undefined) : undefined}
              hint="Se o número ainda não chegou, deixe em branco — dá para anotar depois, na lista de encaminhados."
            >
              {(p) => (
                <Input
                  {...p}
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  placeholder="Ex.: SAN-2026-88213"
                />
              )}
            </Field>
          </>
        )}

        {error && !errorField && (
          <ErrorState title="Não foi possível encaminhar" description={error} />
        )}
      </div>
    </Modal>
  );
}
