import { describe, expect, it } from 'vitest';
import { TICKET_STATUSES } from '../src/enums';
import {
  STATUS_LABELS_ADMIN,
  STATUS_LABELS_CITIZEN,
  forwardedNotice,
  isWhatsAppUrl,
  statusLabel,
  supportLabel,
  teamDispatchedNote,
} from '../src/labels';

/**
 * Requisito 4.9. Este teste existe para travar a tentação de "resolver" a
 * diferença de nomenclatura criando um quarto status no banco.
 */
describe('rótulos de status', () => {
  it('mostra "Em Deslocamento" ao cidadão e "Em Andamento" ao gestor', () => {
    expect(statusLabel('in_progress', 'citizen')).toBe('Em Deslocamento');
    expect(statusLabel('in_progress', 'admin')).toBe('Em Andamento');
  });

  it('usa o mesmo enum para os dois públicos — a diferença é só de exibição', () => {
    expect(Object.keys(STATUS_LABELS_CITIZEN)).toEqual(Object.keys(STATUS_LABELS_ADMIN));
  });

  it('cobre todos os status existentes', () => {
    for (const status of TICKET_STATUSES) {
      expect(statusLabel(status, 'citizen')).toBeTruthy();
      expect(statusLabel(status, 'admin')).toBeTruthy();
    }
  });
});

describe('aviso de encaminhamento', () => {
  it('diz para onde foi e onde acompanhar', () => {
    expect(forwardedNotice({ name: 'DNIT', publicPhone: '(68) 3302-2130' })).toBe(
      'Este chamado é de responsabilidade de DNIT. Acompanhe em: (68) 3302-2130.'
    );
  });

  /** O IMAC só recebe mensagens: o link `wa.me` cru não diria isso a ninguém. */
  it('chama o link wa.me de WhatsApp', () => {
    const imac = { name: 'IMAC', publicUrl: 'https://wa.me/5568992568047' };
    expect(isWhatsAppUrl(imac.publicUrl)).toBe(true);
    expect(forwardedNotice(imac)).toBe(
      'Este chamado é de responsabilidade de IMAC. Acompanhe em: WhatsApp.'
    );
  });

  it('não confunde site comum com WhatsApp', () => {
    expect(isWhatsAppUrl('https://www.gov.br/dnit')).toBe(false);
  });
});

describe('apoios', () => {
  it('concorda o verbo com a quantidade', () => {
    expect(supportLabel(1)).toBe('1 pessoa também viu');
    expect(supportLabel(4)).toBe('4 pessoas também viram');
  });
});

describe('equipe acionada', () => {
  it('nomeia o órgão da categoria com o artigo certo', () => {
    expect(teamDispatchedNote('lighting')).toBe('Equipe da SMCCI acionada.');
    expect(teamDispatchedNote('sanitation')).toBe('Equipe do SAERB acionada.');
  });
});
