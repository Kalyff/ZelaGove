import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/infra/prisma';
import { app, resetDatabase } from './helpers';

/**
 * Cadastro de cidadão — o único caminho pelo qual uma conta nasce a pedido de
 * um desconhecido.
 *
 * A regra que este arquivo existe para proteger é a do PAPEL: quem se cadastra
 * é sempre `citizen`, venha o que vier no corpo. Ela falha em silêncio, que é o
 * pior jeito de falhar — ninguém percebe que virou gestor até esse alguém abrir
 * o painel e enxergar o nome, o e-mail e a foto de todos os chamados da cidade.
 */
describe('cadastro de cidadão', () => {
  const novo = { name: 'Ana Beatriz', email: 'ana@email.com', password: 'senha-de-verdade' };

  beforeEach(async () => {
    await resetDatabase();
  });

  it('cria a conta e já devolve a sessão aberta', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(novo).expect(201);

    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user).toMatchObject({ name: novo.name, email: novo.email, role: 'citizen' });
    // A senha nunca volta, em nenhuma forma.
    expect(JSON.stringify(res.body)).not.toContain(novo.password);

    /* O cookie de refresh precisa vir junto. Sem ele o cadastro entregaria uma
       sessão que morre em 15 minutos sem conseguir renovar — e isso só
       apareceria um quarto de hora depois, longe da causa. */
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('zg_refresh='))).toBe(true);
  });

  /** A regra central. */
  it('ignora `role` no corpo e cria sempre cidadão', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...novo, role: 'admin' })
      .expect(201);

    expect(res.body.user.role).toBe('citizen');
    const gravado = await prisma.user.findUnique({ where: { email: novo.email } });
    expect(gravado?.role).toBe('citizen');
  });

  it('recusa e-mail já cadastrado, apontando o campo', async () => {
    await request(app).post('/api/v1/auth/register').send(novo).expect(201);

    const res = await request(app).post('/api/v1/auth/register').send(novo).expect(422);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
    expect(res.body.error.field).toBe('email');
  });

  /**
   * Sem o `.toLowerCase()` do schema, "ANA@Email.com" passaria pela constraint
   * de unicidade e a mesma pessoa acabaria com duas contas — cada uma enxergando
   * metade dos próprios chamados.
   */
  it('trata e-mail com outra caixa como o mesmo e-mail', async () => {
    await request(app).post('/api/v1/auth/register').send(novo).expect(201);

    await request(app)
      .post('/api/v1/auth/register')
      .send({ ...novo, email: '  ANA@Email.com  ' })
      .expect(422);

    expect(await prisma.user.count()).toBe(1);
  });

  it('recusa senha curta apontando o campo, e não cria nada', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...novo, password: 'curta' })
      .expect(422);

    expect(res.body.error.field).toBe('password');
    expect(await prisma.user.count()).toBe(0);
  });

  /* O cadastro é inútil se a conta não servir depois: a senha precisa ter sido
     gravada de um jeito que o `/login` reconheça. */
  it('deixa a conta pronta para entrar pelo login', async () => {
    await request(app).post('/api/v1/auth/register').send(novo).expect(201);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: novo.email, password: novo.password })
      .expect(200);

    expect(res.body.user.role).toBe('citizen');
  });
});
