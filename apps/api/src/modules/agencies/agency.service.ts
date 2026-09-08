import { prisma } from '../../infra/prisma';

/**
 * Órgãos disponíveis para encaminhamento.
 *
 * Só os ATIVOS: desativar um órgão preserva o histórico de quem já foi
 * encaminhado para lá, mas o tira do seletor. Excluir apagaria de onde o
 * chamado foi — por isso não existe rota de exclusão, e a FK é `Restrict`.
 */
export function listActiveAgencies() {
  return prisma.agency.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
}
