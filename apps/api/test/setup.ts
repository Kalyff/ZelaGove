/**
 * Variáveis mínimas para o schema de env passar. Os testes unitários não tocam
 * banco nem storage; os de integração sobrescrevem DATABASE_URL via .env.test.
 */
import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://zeladoria:zeladoria@localhost:5432/zeladoria?schema=public';
process.env.JWT_ACCESS_SECRET = 'segredo-de-teste-com-mais-de-32-caracteres-ok';
process.env.JWT_REFRESH_SECRET = 'outro-segredo-de-teste-com-mais-de-32-chars';
process.env.S3_ENDPOINT ??= 'http://localhost:9000';
process.env.S3_BUCKET ??= 'zeladoria-test';
process.env.S3_ACCESS_KEY ??= 'zeladoria';
process.env.S3_SECRET_KEY ??= 'zeladoria123';
