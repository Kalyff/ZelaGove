import type { Agency } from '@prisma/client';
import type { AgencyDTO } from '@zeladoria/shared';

/**
 * Só os campos PÚBLICOS do órgão saem para o cliente.
 *
 * O cidadão precisa saber para onde foi e onde cobrar — é isso que separa um
 * encaminhamento de um beco sem saída. Campos internos, se um dia existirem,
 * não atravessam esta função.
 *
 * Mora no módulo de órgãos e não no mapper de chamados porque é usada pelos
 * dois: a rota de órgãos a reescrevia à mão, campo por campo, e nada garantia
 * que as duas cópias continuassem iguais.
 *
 * As duas assinaturas existem porque os dois usos são diferentes: a listagem de
 * órgãos nunca tem nulo e não deveria devolver `(AgencyDTO | null)[]`, enquanto
 * `forwardedTo` é nulo em todo chamado ainda municipal.
 */
export function toAgencyDTO(agency: Agency): AgencyDTO;
export function toAgencyDTO(agency: Agency | null | undefined): AgencyDTO | null;
export function toAgencyDTO(agency: Agency | null | undefined): AgencyDTO | null {
  if (!agency) return null;
  return {
    id: agency.id,
    name: agency.name,
    kind: agency.kind,
    publicPhone: agency.publicPhone,
    publicUrl: agency.publicUrl,
    publicNote: agency.publicNote,
  };
}
