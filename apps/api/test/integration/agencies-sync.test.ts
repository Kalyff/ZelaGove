import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AGENCIES, syncAgencies } from '../../prisma/agencies';
import { prisma } from '../../src/infra/prisma';
import { resetDatabase } from './helpers';

/**
 * `syncAgencies` — o que o `sync-agencies.ts` roda em produção.
 *
 * Roda num banco com dados reais, então as garantias que importam são as de
 * NÃO estragar nada: não duplica, não apaga, não troca o `id` de quem já tem
 * chamado encaminhado e não reativa o que alguém desativou.
 */
describe('carga dos órgãos de encaminhamento', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(() => prisma.$disconnect());

  it('cria a lista inteira num banco vazio', async () => {
    const result = await syncAgencies(prisma);

    expect(result).toEqual({ created: AGENCIES.length, updated: 0, unchanged: 0 });
    expect(await prisma.agency.count()).toBe(AGENCIES.length);
  });

  it('rodar de novo não duplica nada', async () => {
    await syncAgencies(prisma);
    const result = await syncAgencies(prisma);

    expect(result).toEqual({ created: 0, updated: 0, unchanged: AGENCIES.length });
    expect(await prisma.agency.count()).toBe(AGENCIES.length);
  });

  /** É para isto que o script existe: corrigir um contato sem mexer no resto. */
  it('corrige o contato no MESMO registro, preservando o id', async () => {
    await syncAgencies(prisma);
    const [primeiro] = AGENCIES;
    const antes = await prisma.agency.findFirstOrThrow({ where: { name: primeiro.name } });
    await prisma.agency.update({ where: { id: antes.id }, data: { publicPhone: '(68) 0000-0000' } });

    const result = await syncAgencies(prisma);

    const depois = await prisma.agency.findUniqueOrThrow({ where: { id: antes.id } });
    expect(result.updated).toBe(1);
    expect(depois.publicPhone).toBe(primeiro.publicPhone);
  });

  it('não apaga órgão cadastrado fora da lista', async () => {
    const manual = await prisma.agency.create({
      data: { name: 'Órgão cadastrado à mão', kind: 'outro' },
    });

    await syncAgencies(prisma);

    expect(await prisma.agency.findUnique({ where: { id: manual.id } })).not.toBeNull();
  });

  it('não reativa órgão que alguém desativou', async () => {
    await syncAgencies(prisma);
    const [primeiro] = AGENCIES;
    await prisma.agency.updateMany({ where: { name: primeiro.name }, data: { active: false } });

    await syncAgencies(prisma);

    const depois = await prisma.agency.findFirstOrThrow({ where: { name: primeiro.name } });
    expect(depois.active).toBe(false);
  });
});
