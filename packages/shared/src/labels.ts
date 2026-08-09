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
  const onde = [agency.publicPhone, agency.publicUrl].filter(Boolean).join(' · ');
  const base = `Este chamado é de responsabilidade de ${agency.name}.`;
  return onde ? `${base} Acompanhe em ${onde}.` : base;
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
 * O nome do órgão é dado, e varia a cada município: a distribuidora de energia
 * de um não é a do vizinho. Fixar nomes aqui faria a sugestão nascer errada em
 * todo lugar menos no seed. O tipo, ao contrário, é estável — poste apagado é
 * concessionária em qualquer lugar do país.
 *
 * É SUGESTÃO, não decisão: a interface destaca os órgãos desse tipo e não
 * pré-seleciona nenhum. Categoria não determina competência — buraco na via
 * pode ser da prefeitura, do DNIT ou do DER, e quem sabe é quem tem o
 * organograma na mão.
 *
 * Lista vazia significa "não há palpite" — e isso é um resultado válido, bem
 * melhor que um palpite inventado.
 */
export const SUGGESTED_AGENCY_KINDS: Record<TicketCategory, AgencyKind[]> = {
  lighting: ['concessionaria'],
  paving: ['federal', 'estadual'],
  sanitation: ['concessionaria', 'consorcio'],
  traffic: ['federal', 'estadual'],
  cleaning: ['consorcio', 'secretaria'],
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

export function statusLabel(status: TicketStatus, audience: 'citizen' | 'admin'): string {
  return audience === 'citizen' ? STATUS_LABELS_CITIZEN[status] : STATUS_LABELS_ADMIN[status];
}
