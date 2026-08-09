/**
 * Variáveis mínimas para o schema de env passar.
 *
 * A ordem abaixo importa e já custou um seed de desenvolvimento.
 *
 * O comentário antigo aqui dizia que os testes de integração sobrescreviam
 * DATABASE_URL via `.env.test` — e NENHUM código fazia isso. `dotenv/config`
 * carrega só o `.env`, que aponta para o banco de desenvolvimento; o `??=`
 * abaixo, por definição, não sobrescreve o que já veio de lá. Resultado: o
 * `npm run test:integration` truncava as tabelas do banco de desenvolvimento,
 * exatamente o que o README avisa em negrito para não fazer.
 *
 * `.env.test` vem PRIMEIRO e com `override`, para vencer o `.env`.
 * A rede de segurança de verdade é `assertTestDatabase()` em
 * test/integration/helpers.ts: config esquecida acontece, e o guard falha alto.
 */
import dotenv from 'dotenv';

/*
 * `.env.test` PRIMEIRO, e sem `override`.
 *
 * O dotenv não sobrescreve o que já está em `process.env`, então quem carrega
 * antes vence. A precedência que sai daí é a convencional, e importa:
 *
 *   variável de ambiente real  >  .env.test  >  .env
 *
 * Assim o CI (que define DATABASE_URL no workflow e não tem `.env.test`, que é
 * ignorado pelo git) continua mandando, e localmente o `.env.test` vence o
 * `.env` sem sequestrar um `DATABASE_URL=... npm run test:integration` inline.
 *
 * Caminhos relativos ao cwd, que para o vitest é `apps/api` — o mesmo que o
 * `dotenv/config` anterior já assumia.
 */
dotenv.config({ path: '.env.test' });
dotenv.config({ path: '.env' });

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://zeladoria:zeladoria@localhost:5432/zeladoria_test?schema=public';
process.env.JWT_ACCESS_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres-ok';
process.env.JWT_REFRESH_SECRET = 'outro-segredo-de-teste-com-mais-de-32-chars';
process.env.S3_ENDPOINT ??= 'http://localhost:9000';
process.env.S3_BUCKET ??= 'zeladoria-test';
process.env.S3_ACCESS_KEY ??= 'zeladoria';
process.env.S3_SECRET_KEY ??= 'zeladoria123';
