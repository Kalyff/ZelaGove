import type { AgencyKind, TicketCategory, TicketStatus } from './enums';

/**
 * Requisito 4.9: "Em Andamento" é apresentado ao cidadão como "Em Deslocamento".
 * Isso é regra de APRESENTAÇÃO. O banco guarda um único valor: 'in_progress'.
 * Nunca persista o rótulo.
 */

export const STATUS_LABELS_ADMIN: Record<TicketStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  done: 'Concluído',
  forwarded: 'Encaminhado',
};

export const STATUS_LABELS_CITIZEN: Record<TicketStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Deslocamento',
  done: 'Concluído',
  /**
   * O rótulo curto é só o selo. Sozinho, "Encaminhado" lê como empurrar
   * responsabilidade — por isso a tela de detalhe é OBRIGADA a mostrar o órgão
   * responsável e o caminho de acompanhamento (ver `forwardedNotice` abaixo).
   * O nome do órgão não cabe aqui porque este mapa é estático e ele é dado.
   */
  forwarded: 'Encaminhado',
};

/**
 * A frase que o cidadão precisa ler junto do selo `forwarded`.
 *
 * Fica aqui, e não na tela, porque é regra de comunicação e não de layout: o
 * cidadão tem de saber PARA ONDE foi e ONDE cobrar. Um chamado encaminhado sem
 * essas duas informações é um beco sem saída com aparência de atendimento.
 */
export function forwardedNotice(agency: {
  name: string;
  publicPhone?: string | null;
  publicUrl?: string | null;
}): string {
  const base = `Este chamado é de responsabilidade de ${agency.name}.`;
  // Link `wa.me` cru não diz nada a quem lê: vira "WhatsApp".
  const url =
    agency.publicUrl && isWhatsAppUrl(agency.publicUrl) ? 'WhatsApp' : agency.publicUrl;
  const onde = [agency.publicPhone, url].filter(Boolean).join(' · ');
  return onde ? `${base} Acompanhe em: ${onde}.` : base;
}

/**
 * Órgão que só atende por mensagem (o IMAC, por exemplo) tem como contato um
 * link `wa.me`, e não um telefone: o botão "Ligar" discaria para um número que
 * não atende. Quem mostra o contato usa isto para dizer "WhatsApp", e não
 * "site".
 */
export function isWhatsAppUrl(url: string): boolean {
  return /^https:\/\/wa\.me\//.test(url);
}

export const AGENCY_KIND_LABELS: Record<AgencyKind, string> = {
  federal: 'Órgão federal',
  estadual: 'Órgão estadual',
  concessionaria: 'Concessionária',
  secretaria: 'Secretaria municipal',
  consorcio: 'Consórcio intermunicipal',
  outro: 'Outro',
};

/**
 * Sugestão de para ONDE costuma ir cada categoria — por TIPO de órgão, nunca
 * por órgão nomeado.
 *
 * O nome do órgão é dado e fica no cadastro: fixá-lo aqui faria a sugestão
 * nascer errada no dia em que um órgão mudar de nome. O tipo segue a
 * jurisdição do local, que é o que decide a competência em Rio Branco: o
 * problema que sai da malha urbana para uma rodovia federal é do DNIT, da PRF
 * ou do IBAMA; numa rodovia estadual, do DERACRE, do DETRAN/BPTRAN ou do IMAC.
 *  - pavimentação e limpeza (roçagem, sarjetas, bueiros de rodovia): DNIT ou
 *    DERACRE;
 *  - trânsito: PRF nas BRs, DETRAN e BPTRAN nas ACs;
 *  - saneamento que vira crime ambiental (esgoto em igarapé, lixão
 *    clandestino): IMAC ou IBAMA — a água e o esgoto da cidade são do SAERB,
 *    que é da própria prefeitura;
 *  - iluminação: DNIT ou DERACRE em entroncamento e anel viário fora do
 *    perímetro urbano; poste caído e fio partido da rede elétrica, a Energisa.
 *
 * É SUGESTÃO, não decisão: a interface destaca os órgãos desse tipo e não
 * pré-seleciona nenhum. Categoria não determina competência — o mesmo buraco é
 * da EMURB no bairro e do DNIT na BR-364, e quem sabe é quem conhece o local.
 *
 * Lista vazia significa "não há palpite" — e isso é um resultado válido, bem
 * melhor que um palpite inventado.
 */
export const SUGGESTED_AGENCY_KINDS: Record<TicketCategory, AgencyKind[]> = {
  lighting: ['federal', 'estadual', 'concessionaria'],
  paving: ['federal', 'estadual'],
  sanitation: ['estadual', 'federal'],
  traffic: ['federal', 'estadual'],
  cleaning: ['federal', 'estadual'],
  other: [],
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  lighting: 'Iluminação',
  paving: 'Pavimentação',
  sanitation: 'Saneamento',
  traffic: 'Trânsito',
  cleaning: 'Limpeza',
  other: 'Outros',
};

/**
 * Quem a prefeitura aciona para cada categoria, já com o artigo ("do SAERB",
 * "da SMCCI") — é o que o cidadão lê ao ver "Em Deslocamento".
 *
 * Ao contrário de `SUGGESTED_AGENCY_KINDS`, aqui os nomes SÃO fixos: são as
 * equipes da própria prefeitura de Rio Branco, não órgãos externos para onde o
 * chamado é repassado.
 */
export const CATEGORY_TEAMS: Record<TicketCategory, string> = {
  lighting: 'da SMCCI', // Secretaria Municipal de Cuidados com a Cidade
  paving: 'da EMURB',
  sanitation: 'do SAERB', // Serviço de Água e Esgoto de Rio Branco
  traffic: 'da RBTRANS', // Superintendência Municipal de Transportes e Trânsito
  cleaning: 'da SMCCI',
  other: 'da Prefeitura',
};

/**
 * A nota gravada no evento ao passar para Em Andamento. É GRAVADA, não gerada
 * na exibição: se um órgão mudar de nome, o histórico continua dizendo quem foi
 * acionado de fato naquele dia.
 */
export function teamDispatchedNote(category: TicketCategory): string {
  return `Equipe ${CATEGORY_TEAMS[category]} acionada.`;
}

/**
 * Quantos "eu também vi isso" um chamado tem, dito por extenso — a mesma frase
 * no app do cidadão e no painel, para os dois lerem o número do mesmo jeito.
 */
export function supportLabel(count: number): string {
  return count === 1 ? '1 pessoa também viu' : `${count} pessoas também viram`;
}

export function statusLabel(status: TicketStatus, audience: 'citizen' | 'admin'): string {
  return audience === 'citizen' ? STATUS_LABELS_CITIZEN[status] : STATUS_LABELS_ADMIN[status];
}
