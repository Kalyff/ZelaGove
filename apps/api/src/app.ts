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
