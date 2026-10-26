import type { TicketDTO } from '@zeladoria/shared';
import {
  Button,
  IconCopy,
  IconFacebook,
  IconMail,
  IconShare,
  IconSms,
  IconWhatsApp,
  IconXLogo,
  Modal,
  VisuallyHidden,
  useToast,
  type IconProps,
} from '@zeladoria/ui';
import type { ComponentType } from 'react';

/**
 * Link direto de um chamado: o detalhe da aba "Na cidade", o único endereço que
 * QUALQUER cidadão logado consegue abrir — `/chamados/:id` é escopado por
 * `userId` e daria 404 para quem recebe. Quem não está logado passa pelo login
 * e volta para cá (ver `Protected` em App.tsx).
 */
function ticketLink(ticketId: string): string {
  return new URL(`/chamados/na-cidade/${ticketId}`, window.location.origin).href;
}

interface Channel {
  label: string;
  Icon: ComponentType<IconProps>;
  href: string;
  /** Endereço web abre em outra aba; `sms:` e `mailto:` entregam ao app do aparelho. */
  web: boolean;
}

function channels(text: string, url: string, subject: string): Channel[] {
  const e = encodeURIComponent;
  const message = `${text} ${url}`;
  return [
    { label: 'WhatsApp', Icon: IconWhatsApp, href: `https://wa.me/?text=${e(message)}`, web: true },
    /* `?&body=`: o iOS lê o corpo depois do `&`, o Android depois do `?` — esta
       forma serve aos dois. */
    { label: 'SMS', Icon: IconSms, href: `sms:?&body=${e(message)}`, web: false },
    {
      label: 'E-mail',
      Icon: IconMail,
      href: `mailto:?subject=${e(subject)}&body=${e(message)}`,
      web: false,
    },
    /* O Facebook descarta texto pré-preenchido: só o link vai. */
    {
      label: 'Facebook',
      Icon: IconFacebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${e(url)}`,
      web: true,
    },
    {
      label: 'X',
      Icon: IconXLogo,
      href: `https://x.com/intent/post?text=${e(text)}&url=${e(url)}`,
      web: true,
    },
  ];
}

const TILE =
  'flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-card ' +
  'border border-line bg-surface px-2 py-3 font-display text-xs font-bold text-content ' +
  'transition-colors hover:bg-surface-sunken';

const LABEL =
  'font-display text-[11px] font-bold uppercase tracking-[0.12em] text-content-secondary';

/**
 * Compartilhar o protocolo por fora do app: link direto, os canais que o
 * cidadão mais usa e, onde o aparelho oferece, a folha de compartilhamento do
 * sistema — que alcança o que não está na lista (Telegram, Instagram...).
 */
export function ShareTicketDialog({
  ticket,
  open,
  onClose,
}: {
  ticket: Pick<TicketDTO, 'id' | 'protocol' | 'title'>;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const url = ticketLink(ticket.id);
  const subject = `Chamado ${ticket.protocol} — Zeladoria.gov`;
  const text = `Abri o chamado ${ticket.protocol} na Zeladoria.gov: "${ticket.title}". Acompanhe:`;
  /* Ausente no Firefox de desktop e em contexto inseguro (http fora de
     localhost): ali o botão não aparece, em vez de aparecer e falhar. */
  const canShareNatively = typeof navigator.share === 'function';

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado.');
    } catch {
      // Sem clipboard o link continua na tela, selecionável com um toque.
      toast.info('Não foi possível copiar. Selecione o link e copie à mão.');
    }
  }

  async function shareNatively() {
    try {
      await navigator.share({ title: subject, text, url });
    } catch (err) {
      // Fechar a folha do sistema sem escolher um app rejeita com AbortError.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast.info('Não foi possível abrir o compartilhamento. Use uma das opções acima.');
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Compartilhar chamado"
      eyebrow={`Protocolo ${ticket.protocol}`}
    >
      <section>
        <h3 className={LABEL}>Link direto</h3>
        <div className="mt-2 flex items-center gap-2 rounded-field border border-line bg-surface-sunken py-1.5 pl-3 pr-1.5">
          {/* `select-all`: um toque seleciona o endereço inteiro, que é o
              caminho quando a cópia automática não está disponível. */}
          <p className="min-w-0 flex-1 select-all break-all font-mono text-xs text-content">
            {url}
          </p>
          <Button
            variant="secondary"
            onClick={copyLink}
            iconLeft={<IconCopy className="h-4 w-4" />}
            data-autofocus
          >
            Copiar
          </Button>
        </div>
      </section>

      <section className="mt-5">
        <h3 className={LABEL}>Enviar por</h3>
        <ul className="mt-2 grid grid-cols-3 gap-2">
          {channels(text, url, subject).map(({ label, Icon, href, web }) => (
            <li key={label}>
              <a
                href={href}
                className={TILE}
                {...(web && { target: '_blank', rel: 'noopener noreferrer' })}
              >
                <Icon className="h-6 w-6 text-accent" />
                {label}
                {web && <VisuallyHidden> (abre em outra aba)</VisuallyHidden>}
              </a>
            </li>
          ))}
          {canShareNatively && (
            <li>
              <button type="button" onClick={shareNatively} className={TILE}>
                <IconShare className="h-6 w-6 text-accent" />
                Outros apps
              </button>
            </li>
          )}
        </ul>
      </section>

      {/* Dito antes de enviar, e não descoberto por quem recebe: o link abre o
          app do cidadão, que exige conta. */}
      <p className="mt-5 text-xs leading-relaxed text-content-secondary">
        Quem receber o link precisa entrar ou criar uma conta no Zeladoria.gov para ver o
        chamado. Seu nome não aparece nele.
      </p>
    </Modal>
  );
}
