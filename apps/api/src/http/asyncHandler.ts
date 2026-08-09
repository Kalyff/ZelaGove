import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 não captura rejeição de promise em handler async.
 * Sem este wrapper, um erro assíncrono derruba a requisição sem resposta.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
