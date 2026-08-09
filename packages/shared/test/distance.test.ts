import { describe, expect, it } from 'vitest';
import { distanceBetween, formatDistance } from '../src/distance';

/* Rio Branco (AC) — mesma região das coordenadas do seed. */
const PRACA = { latitude: -9.97499, longitude: -67.8243 };

describe('distanceBetween', () => {
  it('devolve zero para o mesmo ponto', () => {
    expect(distanceBetween(PRACA, PRACA)).toBe(0);
  });

  /**
   * Um grau de latitude são ~111,2 km em qualquer longitude — é a checagem que
   * pega inversão de argumentos e confusão entre graus e radianos, os dois
   * erros clássicos de haversine.
   */
  it('acerta um grau de latitude (~111 km)', () => {
    const umGrauAoNorte = { latitude: PRACA.latitude + 1, longitude: PRACA.longitude };
    expect(distanceBetween(PRACA, umGrauAoNorte)).toBeCloseTo(111_195, -2);
  });

  it('é simétrica', () => {
    const outro = { latitude: -9.98, longitude: -67.83 };
    expect(distanceBetween(PRACA, outro)).toBeCloseTo(distanceBetween(outro, PRACA), 6);
  });

  /* Perto do equador, 0,001° de longitude é ~110 m. Confere a ordem de
     grandeza da escala que a lista realmente usa: quarteirões, não continentes. */
  it('mede distâncias curtas na ordem de grandeza certa', () => {
    const aQuarteirao = { latitude: PRACA.latitude, longitude: PRACA.longitude + 0.001 };
    const d = distanceBetween(PRACA, aQuarteirao);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
});

describe('formatDistance', () => {
  it('arredonda para 10 m abaixo de 1 km', () => {
    // O GPS de celular erra mais que 10 m; "a 183 m" fingiria precisão.
    expect(formatDistance(183)).toBe('180 m');
    expect(formatDistance(7)).toBe('10 m');
    expect(formatDistance(0)).toBe('0 m');
  });

  it('vira km a partir de 1000 m, com vírgula decimal', () => {
    expect(formatDistance(1000)).toBe('1,0 km');
    expect(formatDistance(1240)).toBe('1,2 km');
    expect(formatDistance(12_500)).toBe('12,5 km');
  });

  it('não usa ponto como separador decimal', () => {
    expect(formatDistance(2500)).not.toContain('.');
  });
});
