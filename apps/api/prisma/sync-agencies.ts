/**
 * Carrega os órgãos de encaminhamento (`agencies.ts`) numa instalação que já
 * existe — produção inclusive — sem apagar nada.
 *
 * Existe porque o `seed.ts` não serve para isso: ele começa com um TRUNCATE de
 * todas as tabelas. E sem órgão cadastrado o gestor não encaminha chamado
 * nenhum: o seletor do painel fica vazio.
 *
 *   npm run sync-agencies --workspace @zeladoria/api
 *
 * Em produção, dentro do container:
 *
 *   docker compose -f docker-compose.prod.yml exec api npx tsx prisma/sync-agencies.ts
 *
 * Idempotente: depois de corrigir um telefone em `agencies.ts`, rodar de novo
 * atualiza só o que mudou.
 *
 * Mesmo padrão do `create-admin.ts`: PrismaClient direto, sem passar por
 * `infra/prisma.ts`, que exigiria os segredos de JWT e de S3 para gravar uma
 * lista de telefones.
 */
import { PrismaClient } from '@prisma/client';
import { AGENCIES, syncAgencies } from './agencies';

const prisma = new PrismaClient();

async function main() {
  const { created, updated, unchanged } = await syncAgencies(prisma);
  console.log(
    `Órgãos de encaminhamento (${AGENCIES.length} na lista): ` +
      `${created} criados, ${updated} atualizados, ${unchanged} sem mudança.`
  );
}

main()
  .catch((err) => {
    console.error('Falha ao carregar os órgãos:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
