import { IconExternal } from '@zeladoria/ui';
import type { AgencyDTO } from '@zeladoria/shared';

/**
 * O que o cidadão precisa ler quando o chamado sai da prefeitura.
 *
 * O selo diz "Encaminhado" e, sozinho, isso lê como empurrar responsabilidade.
 * O que transforma o encaminhamento em atendimento são duas informações: PARA
 * ONDE foi e ONDE cobrar. Sem elas, o chamado vira um beco sem saída com
 * aparência de andamento — e é aí que a frustração nasce.
 *
 * Telefone vira `tel:` e site vira link: num aparelho de mão, um número que não
 * disca é um número que o cidadão vai copiar errado.
 */
export function ForwardedNotice({
  agency,
  externalProtocol,
}: {
  agency: AgencyDTO;
  /** Protocolo no OUTRO órgão, quando já informado. É por ele que o cidadão
   *  será atendido lá — o protocolo municipal não vale nada do outro lado. */
  externalProtocol?: string | null;
}) {
  return (
    <section className="rounded-card border border-line-strong bg-surface-sunken p-4">
      <h3 className="flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[0.12em] text-content-secondary">
        <IconExternal className="h-3.5 w-3.5" />
        Responsável por este serviço
      </h3>

      <p className="mt-2 font-display text-base font-bold leading-snug text-content">
        {agency.name}
      </p>

      <p className="mt-1 text-sm leading-relaxed text-content-secondary">
        Este chamado não é de competência da prefeitura. Ele foi registrado e encaminhado ao órgão
        acima, que é quem executa este serviço.
      </p>

      {agency.publicNote && (
        <p className="mt-2 text-sm leading-relaxed text-content-secondary">{agency.publicNote}</p>
      )}

      {externalProtocol && (
        <p className="mt-3 text-sm text-content-secondary">
          Protocolo no órgão:{' '}
          <span className="font-mono font-bold text-content">{externalProtocol}</span>
        </p>
      )}

      {(agency.publicPhone || agency.publicUrl) && (
        <div className="mt-3 flex flex-col gap-2">
          {agency.publicPhone && (
            <a
              href={`tel:${agency.publicPhone.replace(/[^\d+]/g, '')}`}
              /* `min-h-11` = 44px de alvo de toque. */
              className="flex min-h-11 items-center justify-center rounded-field bg-accent px-4 font-display text-sm font-bold text-accent-on"
            >
              Ligar para {agency.publicPhone}
            </a>
          )}
          {agency.publicUrl && (
            <a
              href={agency.publicUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="flex min-h-11 items-center justify-center rounded-field border border-line-strong px-4 text-sm font-semibold text-content"
            >
              Abrir o site do órgão
            </a>
          )}
        </div>
      )}
    </section>
  );
}
