import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@zeladoria/shared';
import { Errors } from '../http/errors';
import { verifyAccessToken } from '../modules/auth/tokens';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: UserRole };
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(Errors.unauthenticated());

  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(Errors.unauthenticated());
  }
}

/**
 * Requisito 4.7: a verificação de papel é do SERVIDOR. O guard de rota no
 * front é conveniência de navegação, não controle de acesso.
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Errors.unauthenticated());
    if (!roles.includes(req.user.role)) return next(Errors.forbidden());
    return next();
  };
}
