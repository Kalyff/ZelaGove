import { createApp } from './app';
import { env } from './config/env';
import { logger } from './infra/logger';
import { ensureBucket } from './infra/storage';

async function bootstrap() {
  await ensureBucket();

  createApp().listen(env.PORT, () => {
    logger.info(`API ouvindo em http://localhost:${env.PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Falha ao iniciar a API');
  process.exit(1);
});
