import type { AgencyKind, PrismaClient } from '@prisma/client';

/**
 * Órgãos de fora da prefeitura para onde o gestor encaminha chamados: os
 * estaduais e federais que respondem por rodovias, trânsito e meio ambiente em
 * Rio Branco, e a distribuidora de energia. Lista e contatos levantados pela
 * equipe em outubro de 2026 — telefone de órgão muda, então confira antes de
 * cada carga em produção.
 *
 * É a fonte única dos dois caminhos que gravam órgãos: o `seed.ts`
 * (desenvolvimento) e o `sync-agencies.ts` (instalação existente, produção
 * inclusive). Para corrigir um contato, edite aqui e rode o sync de novo.
 *
 * Os campos `public*` são o que o CIDADÃO vê quando o chamado dele é
 * encaminhado — sem eles o encaminhamento vira beco sem saída. Um número só em
 * `publicPhone`, porque ele vira o botão "Ligar"; os demais canais vão na nota.
 * O IMAC só recebe mensagens, então o contato dele é um link `wa.me` e não um
 * telefone que o botão tentaria discar.
 *
 * As equipes da própria prefeitura (SMCCI, EMURB, SAERB, RBTRANS) não entram
 * aqui: elas EXECUTAM o chamado (`CATEGORY_TEAMS`), não o recebem encaminhado.
 */
export const AGENCIES: ReadonlyArray<{
  name: string;
  kind: AgencyKind;
  publicPhone?: string;
  publicUrl?: string;
  publicNote?: string;
}> = [
  {
    name: 'DNIT — Superintendência no Acre',
    kind: 'federal',
    publicPhone: '(68) 3302-2130',
    publicNote:
      'Rodovias federais (BR-364, BR-317): buracos, pontes, roçagem das margens, sarjetas e bueiros ' +
      'ao longo das BRs, e iluminação de entroncamentos e anéis viários fora do perímetro urbano.',
  },
  {
    name: 'PRF — Polícia Rodoviária Federal',
    kind: 'federal',
    publicPhone: '(68) 3212-5300',
    publicNote:
      'Fiscalização, controle de velocidade e acidentes nas rodovias federais. Emergência na estrada: 191.',
  },
  {
    name: 'IBAMA — Superintendência no Acre',
    kind: 'federal',
    publicPhone: '0800 061 8080',
    publicNote:
      'Dano ambiental em área federal, terra indígena ou com impacto interestadual, como rios de ' +
      'fronteira. O telefone acima é a Linha Verde, para denúncias; a superintendência em Rio Branco ' +
      'atende no (68) 2018-0036.',
  },
  {
    name: 'DERACRE — Departamento de Estradas de Rodagem do Acre',
    kind: 'estadual',
    publicPhone: '(68) 3221-2435',
    publicNote:
      'Rodovias estaduais (AC-40, AC-010) e ramais principais: pavimentação, conservação, roçagem das ' +
      'margens e iluminação fora do perímetro urbano. Também atende no (68) 3221-7777.',
  },
  {
    name: 'DETRAN/AC — Departamento Estadual de Trânsito',
    kind: 'estadual',
    publicPhone: '(68) 3215-4160',
    publicNote: 'Veículos e habilitação. Dúvidas também pelo WhatsApp (68) 99228-0282.',
  },
  {
    name: 'BPTRAN — Batalhão de Policiamento de Trânsito (PMAC)',
    kind: 'estadual',
    publicPhone: '(68) 3211-7878',
    publicNote:
      'Fiscalização de trânsito e acidentes com vítimas nas rodovias estaduais e, em apoio à RBTRANS, ' +
      'nas vias da cidade. Também atende no (68) 3221-4048; emergências pelo 190.',
  },
  {
    name: 'IMAC — Instituto de Meio Ambiente do Acre',
    kind: 'estadual',
    publicUrl: 'https://wa.me/5568992568047',
    publicNote:
      'Esgoto lançado em igarapés, lixão clandestino e outros crimes ambientais no Estado. Denúncias ' +
      'só por mensagem no WhatsApp (68) 99256-8047; o número não recebe ligações.',
  },
  {
    name: 'Energisa Acre — Distribuidora de Energia',
    kind: 'concessionaria',
    publicPhone: '0800 647 7196',
    publicNote: 'Rede elétrica da distribuidora: poste caído ou com risco de queda, fio partido e falta de energia.',
  },
];

/**
 * Grava `AGENCIES` no banco sem apagar nada: cria o que falta e atualiza o que
 * mudou, casando pelo NOME. Rodar duas vezes dá o mesmo resultado.
 *
 * Atualiza no lugar, e nunca apaga e recria, porque chamados encaminhados
 * apontam para o `id` do órgão: o histórico continua ligado ao mesmo registro,
 * agora com o contato corrigido.
 *
 * O que fica de fora de propósito:
 *  - órgão que não está na lista — pode ter sido cadastrado à mão, e sumir com
 *    ele quebraria o histórico de quem foi encaminhado para lá;
 *  - `active` — desativar é decisão de quem opera; o sync não reativa ninguém.
 *
 * Renomear um órgão aqui cria OUTRO registro; desative o antigo no banco.
 */
export async function syncAgencies(db: PrismaClient) {
  return db.$transaction(async (tx) => {
    const result = { created: 0, updated: 0, unchanged: 0 };

    for (const agency of AGENCIES) {
      // Campo ausente na lista vira nulo: a lista é a verdade sobre estes órgãos.
      const data = {
        kind: agency.kind,
        publicPhone: agency.publicPhone ?? null,
        publicUrl: agency.publicUrl ?? null,
        publicNote: agency.publicNote ?? null,
      };
      const existing = await tx.agency.findFirst({ where: { name: agency.name } });

      if (!existing) {
        await tx.agency.create({ data: { name: agency.name, ...data } });
        result.created += 1;
      } else if (
        existing.kind !== data.kind ||
        existing.publicPhone !== data.publicPhone ||
        existing.publicUrl !== data.publicUrl ||
        existing.publicNote !== data.publicNote
      ) {
        await tx.agency.update({ where: { id: existing.id }, data });
        result.updated += 1;
      } else {
        result.unchanged += 1;
      }
    }

    return result;
  });
}
