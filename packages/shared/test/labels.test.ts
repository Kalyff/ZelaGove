import { describe, expect, it } from 'vitest';
import { TICKET_STATUSES } from '../src/enums';
import { STATUS_LABELS_ADMIN, STATUS_LABELS_CITIZEN, statusLabel } from '../src/labels';

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
