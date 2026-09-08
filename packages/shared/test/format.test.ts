import { describe, expect, it } from 'vitest';
import { coords, dateTime, firstName, initials, shortDate, timelineDate } from '../src/format';

/**
 * As datas são montadas a partir de componentes LOCAIS, não de um ISO com fuso
 * fixo. As funções formatam no fuso do aparelho de propósito — é a hora que o
 * cidadão e o servidor veem no relógio deles — então fixar `-03:00` aqui faria
 * o teste passar só em máquina de Brasília e falhar no CI em UTC.
 */
const cincoDeAgosto = new Date(2026, 7, 5, 14, 30).toISOString();
const noveDeJaneiro = new Date(2026, 0, 9, 10, 0).toISOString();

describe('formatação de data', () => {
  it('shortDate usa dois dígitos no dia e mês sem ponto', () => {
    expect(shortDate(cincoDeAgosto)).toBe('05 ago');
  });

  /* A vírgula sai do próprio `Intl` do pt-BR quando data e hora vêm no mesmo
     formatador. Fica registrada aqui para uma remoção acidental aparecer. */
  it('dateTime traz o ano — é o formato do painel', () => {
    expect(dateTime(cincoDeAgosto)).toBe('05/08/2026, 14:30');
  });

  it('timelineDate omite o ano e é igual nas duas interfaces', () => {
    expect(timelineDate(cincoDeAgosto)).toBe('05/08 14:30');
  });

  it('preserva o zero à esquerda no dia', () => {
    expect(shortDate(noveDeJaneiro)).toBe('09 jan');
  });
});

describe('coords', () => {
  /* Seis casas é a precisão da coluna Decimal(9, 6) do banco: arredondar menos
     faria o par exibido não bater com o ponto no mapa. */
  it('completa até seis casas decimais', () => {
    expect(coords(-9.97499, -67.8243)).toBe('-9.974990, -67.824300');
  });
});

describe('nomes', () => {
  it('firstName pega só o primeiro nome', () => {
    expect(firstName('Ana Beatriz Lima')).toBe('Ana');
  });

  it('initials junta a inicial do primeiro e a do último nome', () => {
    expect(initials('Ana Beatriz Lima')).toBe('AL');
  });

  /* Nome único cai no mesmo caminho: primeiro e último são a mesma palavra. */
  it('initials com nome único repete a inicial', () => {
    expect(initials('Marina')).toBe('MM');
  });
});
