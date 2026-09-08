import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { AppError, Errors } from '../http/errors';
import { logger } from '../infra/logger';

/**
 * Envelope único de erro (§4.4 do plano): `{ error: { code, message, field? } }`.
 *
 * Uma função só, e não um literal repetido em cada ramo: o cliente lê `field`
 * para mostrar a mensagem NO campo errado, e o ramo do Multer serializava esse
 * envelope à mão — com `field` sempre presente, mesmo nulo, ao contrário do
 * ramo do `AppError`. Formato de erro que varia conforme a origem do erro é
 * exatamente o que um contrato único existe para impedir.
 */
function sendAppError(res: Response, err: AppError) {
  return res.status(err.status).json({
    error: { code: err.code, message: err.message, ...(err.field ? { field: err.field } : {}) },
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.' } });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return sendAppError(res, err);
  }

  if (err instanceof MulterError) {
    // O upload é limitado a 5MB e a um arquivo; qualquer outra falha do multer
    // é arquivo que não dá para processar.
    return sendAppError(
      res,
      err.code === 'LIMIT_FILE_SIZE' ? Errors.photoTooLarge() : Errors.invalidPhoto()
    );
  }

  if (err instanceof ZodError) {
    const first = err.issues[0];
    return sendAppError(
      res,
      new AppError(
        422,
        'VALIDATION_ERROR',
        first?.message ?? 'Dados inválidos.',
        first?.path.join('.') || undefined
      )
    );
  }

  logger.error({ err }, 'Erro não tratado');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno. Tente novamente.' },
  });
}
