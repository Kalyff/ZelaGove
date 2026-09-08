import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { corsOrigins } from './config/env';
import { logger } from './infra/logger';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRoutes } from './modules/auth/auth.routes';
import { agencyRoutes } from './modules/agencies/agency.routes';
import { metricsRoutes } from './modules/metrics/metrics.routes';
import { adminTicketRoutes } from './modules/tickets/admin.routes';
import { citizenTicketRoutes } from './modules/tickets/citizen.routes';

export function createApp() {
  const app = express();

  /**
   * Um salto de proxy — o Caddy do `docker-compose.prod.yml`.
   *
   * Sem isto, `req.ip` é o IP do proxy para TODO mundo em produção, e os
   * limitadores de taxa deixam de separar quem é quem: dez tentativas erradas de
   * uma pessoa passam a trancar o login da cidade inteira por quinze minutos.
   * Um limite pensado contra força bruta vira negação de serviço.
   *
   * `1`, e não `true`: `true` confiaria em qualquer `X-Forwarded-For` que
   * chegasse, e aí forjar o cabeçalho seria o bastante para escapar do limite.
   */
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/tickets', citizenTicketRoutes);
  app.use('/api/v1/admin/tickets', adminTicketRoutes);
  app.use('/api/v1/admin/metrics', metricsRoutes);
  app.use('/api/v1/admin/agencies', agencyRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
