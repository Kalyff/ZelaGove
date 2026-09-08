/**
 * Formatação de data, coordenada e nome para as duas interfaces.
 *
 * Mora em `shared` pelo mesmo motivo de `distance.ts` e de `forwardedNotice`:
 * é apresentação com lógica dentro, erra em silêncio (uma data trocada parece
 * plausível) — e aqui existe suíte de testes, enquanto os apps não têm nenhuma.
 * Antes cada app tinha o seu `lib/format.ts` e `timelineDate`/`coords` estavam
 * escritos duas vezes, palavra por palavra.
 *
 * `Intl` com locale fixo em `pt-BR`: o produto é de município brasileiro, e
 * deixar a formatação seguir o locale do aparelho faria a mesma data aparecer
 * como "08/05" para um cidadão e "05/08" para o servidor que atende o chamado.
 */

const MONTH_SHORT = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
const DAY_MONTH = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const HOUR_MINUTE = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const FULL = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** "05 ago" — formato dos cards da lista do cidadão (requisito 3.1.2). */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  // `short` do pt-BR sai como "ago." — o ponto sobra numa linha de card.
  const month = MONTH_SHORT.format(d).replace('.', '');
  return `${day} ${month}`;
}

/** "05/08/2026 14:30" — formato do painel, onde o ano importa para triagem. */
export function dateTime(iso: string): string {
  return FULL.format(new Date(iso));
}

/** "05/08 14:30" — formato da linha do tempo, igual nas duas interfaces. */
export function timelineDate(iso: string): string {
  const d = new Date(iso);
  return `${DAY_MONTH.format(d)} ${HOUR_MINUTE.format(d)}`;
}

/**
 * Seis casas decimais — a mesma precisão da coluna `Decimal(9, 6)` do banco.
 * Arredondar menos aqui faria o par exibido não bater com o ponto no mapa.
 */
export function coords(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/** "Bem-vindo, João" — nome completo não cabe no cabeçalho do celular. */
export function firstName(fullName: string): string {
  return fullName.trim().split(' ')[0];
}

/** Iniciais do avatar do painel: primeiro e último nome. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  /* Índice explícito e não `parts.at(-1)`: `Array.prototype.at` é ES2022, e o
     `lib` dos dois apps está em ES2020 — o mesmo código quebraria ao ser
     compilado a partir deles. */
  const last = parts[parts.length - 1];
  return ((parts[0]?.[0] ?? '') + (last?.[0] ?? '')).toUpperCase();
}
