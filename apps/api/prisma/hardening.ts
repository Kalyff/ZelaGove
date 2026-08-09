/**
 * Regras que o Prisma não expressa e que NÃO podem viver só no código da
 * aplicação. Rode depois de `prisma migrate dev`.
 *
 * Por que no banco e não no service: a imutabilidade da timeline (requisito
 * 4.2) é uma garantia de auditoria. Se ela depender apenas da disciplina do
 * código, qualquer script de manutenção, migration mal feita ou acesso direto
 * ao banco a quebra silenciosamente.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const statements: string[] = [
  // Habilitada desde já para que a migration espacial futura seja trivial.
  `CREATE EXTENSION IF NOT EXISTS postgis`,

  `CREATE OR REPLACE FUNCTION ticket_events_append_only()
   RETURNS TRIGGER AS $$
   BEGIN
     RAISE EXCEPTION 'ticket_events é append-only: % não é permitido (requisito 4.2)', TG_OP;
   END;
   $$ LANGUAGE plpgsql`,

  `DROP TRIGGER IF EXISTS ticket_events_no_update ON ticket_events`,
  `CREATE TRIGGER ticket_events_no_update
     BEFORE UPDATE ON ticket_events
     FOR EACH ROW EXECUTE FUNCTION ticket_events_append_only()`,

  `DROP TRIGGER IF EXISTS ticket_events_no_delete ON ticket_events`,
  `CREATE TRIGGER ticket_events_no_delete
     BEFORE DELETE ON ticket_events
     FOR EACH ROW EXECUTE FUNCTION ticket_events_append_only()`,
];

async function main() {
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
    console.log('  ok:', sql.split('\n')[0].trim().slice(0, 70));
  }
  console.log('Hardening aplicado.');
}

main()
  .catch((err) => {
    console.error('Falha no hardening:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
