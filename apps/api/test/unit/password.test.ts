import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/modules/auth/password';

describe('hash de senha', () => {
  it('confirma a senha correta', async () => {
    const hash = await hashPassword('senha123');
    expect(await verifyPassword('senha123', hash)).toBe(true);
  });

  it('recusa senha errada', async () => {
    const hash = await hashPassword('senha123');
    expect(await verifyPassword('senha124', hash)).toBe(false);
  });

  it('gera hashes diferentes para a mesma senha', async () => {
    // Salt aleatório: dois usuários com a mesma senha não podem ter o mesmo
    // hash, ou um vazamento do banco entrega os dois de uma vez.
    expect(await hashPassword('senha123')).not.toBe(await hashPassword('senha123'));
  });

  it('recusa hash malformado sem lançar exceção', async () => {
    expect(await verifyPassword('senha123', 'lixo')).toBe(false);
    expect(await verifyPassword('senha123', '')).toBe(false);
    expect(await verifyPassword('senha123', 'bcrypt$abc$def')).toBe(false);
  });

  it('grava o algoritmo no início do hash para permitir migração futura', async () => {
    expect(await hashPassword('senha123')).toMatch(/^scrypt\$/);
  });
});
