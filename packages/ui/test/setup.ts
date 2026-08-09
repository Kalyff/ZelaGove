import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(cleanup);

/**
 * O jsdom NÃO faz layout: `offsetParent` é sempre `null` e `getClientRects()`
 * sempre vazio, para qualquer elemento.
 *
 * O `useFocusTrap` usa esses dois sinais para descartar focáveis invisíveis
 * (item de menu fechado, campo em aba oculta). Sem o polyfill ele conclui que
 * NADA é focável e o teste falharia por um motivo que não existe no navegador.
 *
 * O polyfill vive aqui, e não no componente: enfraquecer a checagem de
 * visibilidade em produção para agradar o ambiente de teste seria trocar um
 * comportamento correto por um teste verde.
 */
Element.prototype.getClientRects = function getClientRects() {
  return Object.assign([{ width: 1, height: 1, top: 0, left: 0, right: 1, bottom: 1 }], {
    item: (i: number) => (i === 0 ? { width: 1, height: 1 } : null),
  }) as unknown as DOMRectList;
};

/**
 * O jsdom não implementa `matchMedia`, e vários hooks do design system o
 * consultam (tema, reduced motion). Sem este stub eles lançam na montagem.
 */
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}
