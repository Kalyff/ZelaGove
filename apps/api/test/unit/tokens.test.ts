import { describe, expect, it } from 'vitest';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../src/modules/auth/tokens';

describe('tokens', () => {
  const payload = { sub: 'user-123', role: 'admin' as const };

  it('carrega id e papel no access token', () => {
    const decoded = verifyAccessToken(signAccessToken(payload));
    expect(decoded.sub).toBe('user-123');
    expect(decoded.role).toBe('admin');
  });

  it('não aceita refresh token no lugar de access token', () => {
    // Segredos separados: um refresh vazado não vira credencial de acesso.
    expect(() => verifyAccessToken(signRefreshToken(payload))).toThrow();
    expect(() => verifyRefreshToken(signAccessToken(payload))).toThrow();
  });

  it('rejeita token adulterado', () => {
    const token = signAccessToken(payload);
    const tampered = token.slice(0, -3) + 'aaa';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});
