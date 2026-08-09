import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { AppError, Errors } from '../http/errors';
import { logger } from '../infra/logger';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.field ? { field: err.field } : {}) },
    });
  }

  if (err instanceof MulterError) {
    const mapped = err.code === 'LIMIT_FILE_SIZE' ? Errors.photoTooLarge() : Errors.invalidPhoto();
    return res.status(mapped.status).json({
      error: { code: mapped.code, message: mapped.message, field: mapped.field },
    });
  }

  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: first?.message ?? 'Dados inválidos.',
        field: first?.path.join('.') || undefined,
      },
    });
  }

  logger.error({ err }, 'Erro não tratado');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno. Tente novamente.' },
  });
}
