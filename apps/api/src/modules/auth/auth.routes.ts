import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema } from '@zeladoria/shared';
import { asyncHandler } from '../../http/asyncHandler';
import { Errors } from '../../http/errors';
import { prisma } from '../../infra/prisma';
import { requireAuth } from '../../middleware/auth';
import { verifyPassword } from './password';
import {
  REFRESH_COOKIE,
  refreshCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './tokens';

export const authRoutes = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas. Aguarde alguns minutos.' } },
});

/**
 * Endpoint único de login. As TELAS são separadas (requisito 2.3), mas o papel
 * volta no payload e o front decide o destino. Manter um endpoint evita
 * duplicar a lógica de sessão.
 */
authRoutes.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    // Mesma mensagem para e-mail inexistente e senha errada: não entregamos
    // ao atacante a informação de quais contas existem.
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw Errors.invalidCredentials();
    }

    const payload = { sub: user.id, role: user.role };
    res.cookie(REFRESH_COOKIE, signRefreshToken(payload), refreshCookieOptions);

    res.json({
      accessToken: signAccessToken(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

authRoutes.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw Errors.unauthenticated();

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw Errors.unauthenticated();
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw Errors.unauthenticated();

    const next = { sub: user.id, role: user.role };
    res.cookie(REFRESH_COOKIE, signRefreshToken(next), refreshCookieOptions);
    res.json({
      accessToken: signAccessToken(next),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  })
);

authRoutes.post('/logout', (_req, res) => {
  // Limitação assumida no protótipo: o refresh token é stateless, então
  // "logout" limpa o cookie mas não revoga um token já copiado. A evolução é
  // uma tabela de sessões com jti — ver README.
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
  res.status(204).send();
});

authRoutes.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw Errors.unauthenticated();
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  })
);
