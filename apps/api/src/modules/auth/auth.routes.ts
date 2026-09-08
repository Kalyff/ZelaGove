import { Prisma, type User } from '@prisma/client';
import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema, registerSchema } from '@zeladoria/shared';
import { env } from '../../config/env';
import { asyncHandler } from '../../http/asyncHandler';
import { Errors } from '../../http/errors';
import { prisma } from '../../infra/prisma';
import { requireAuth } from '../../middleware/auth';
import { hashPassword, verifyPassword } from './password';
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
 * Criar conta em massa é o abuso a conter aqui, não adivinhar senha — por isso a
 * janela é mais larga que a do login. Cada tentativa custa um `scrypt`, que é
 * caro de propósito: sem limite, o cadastro seria um jeito barato de consumir
 * CPU e memória do servidor.
 *
 * DEZ por hora, e não menos: a contagem é por IP, e um IP pode ser uma escola,
 * uma repartição inteira ou o CGNAT de uma operadora móvel. Apertar demais aqui
 * não barra o robô — que troca de IP — e barra a sexta pessoa de um mesmo
 * prédio que resolveu abrir um chamado na mesma tarde. É uma proteção contra
 * volume, e assume não distinguir quem está atrás do mesmo endereço.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  /* Nos testes, a suíte inteira sai do mesmo IP e estouraria o teto no meio dos
     casos — o limitador passaria a decidir o resultado de asserções que são
     sobre outra coisa. `NODE_ENV` é validado por enum em `config/env.ts` e a
     pilha de produção fixa `production`, então isto não tem como ficar ligado
     onde importa. */
  skip: () => env.NODE_ENV === 'test',
  message: {
    error: { code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas. Aguarde alguns minutos.' },
  },
});

/**
 * Abre a sessão: cookie de refresh + access token no corpo.
 *
 * Uma função só porque login e cadastro precisam produzir EXATAMENTE a mesma
 * sessão. Se as duas montassem o payload por conta própria, bastaria uma delas
 * esquecer o cookie para o cadastro entregar uma sessão que morre em 15 minutos
 * sem conseguir renovar — e isso só apareceria em produção, um quarto de hora
 * depois de alguém se cadastrar.
 */
function abrirSessao(res: Response, user: User) {
  const payload = { sub: user.id, role: user.role };
  res.cookie(REFRESH_COOKIE, signRefreshToken(payload), refreshCookieOptions);
  return {
    accessToken: signAccessToken(payload),
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

/**
 * Cadastro de cidadão.
 *
 * Já devolve a sessão pronta: obrigar a pessoa a preencher o login logo depois
 * de preencher o cadastro é atrito sem contrapartida — ela acabou de provar que
 * sabe a senha, porque acabou de escolhê-la.
 *
 * O PAPEL É ESCRITO AQUI, nunca lido do corpo. O `registerSchema` sequer declara
 * `role` e o zod descarta chave desconhecida, mas a garantia de que ninguém vira
 * gestor se cadastrando não pode depender de um único ponto lembrar dela.
 */
authRoutes.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const { name, email, password } = registerSchema.parse(req.body);

    try {
      const user = await prisma.user.create({
        data: { name, email, role: 'citizen', passwordHash: await hashPassword(password) },
      });
      res.status(201).json(abrirSessao(res, user));
    } catch (err) {
      /* A colisão é resolvida pela CONSTRAINT, não por um `findUnique` antes.
         Consultar e depois inserir deixa uma janela entre as duas operações: dois
         cadastros simultâneos com o mesmo e-mail passariam os dois pela consulta
         e o segundo estouraria um 500. Aqui o banco decide, e o P2002 vira a
         mesma mensagem amigável. */
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw Errors.emailAlreadyRegistered();
      }
      throw err;
    }
  })
);

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

    res.json(abrirSessao(res, user));
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

    // Renovar é reabrir a sessão: mesmo cookie, mesmo par de tokens. Montar o
    // payload à mão aqui era a terceira cópia da mesma coisa.
    res.json(abrirSessao(res, user));
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
