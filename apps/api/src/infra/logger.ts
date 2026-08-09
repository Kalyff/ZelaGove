import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  // Log estruturado em JSON desde o início: é o que permite trocar para um
  // agregador depois sem reescrever nada.
  redact: ['req.headers.authorization', 'req.headers.cookie', 'password'],
});
