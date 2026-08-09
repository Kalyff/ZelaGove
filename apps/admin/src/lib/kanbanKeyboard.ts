import type { KeyboardCoordinateGetter } from '@dnd-kit/core';
import { BOARD_STATUSES } from '@zeladoria/shared';

/**
 * Move o card entre COLUNAS com as setas esquerda/direita.
 *
 * O `sortableKeyboardCoordinates` do dnd-kit não serve aqui: ele presume uma
 * lista ordenável e move item a item dentro dela. O Kanban tem três destinos
 * fixos, e o que interessa é saltar de um para o outro.
 *
 * Isto é ADITIVO — o `<select>` de cada card continua sendo o caminho mais
 * rápido para quem usa teclado, e segue existindo.
 */
export const kanbanCoordinateGetter: KeyboardCoordinateGetter = (event, { context }) => {
  const { droppableRects, collisionRect } = context;
  if (!collisionRect) return;

  const delta = event.code === 'ArrowRight' ? 1 : event.code === 'ArrowLeft' ? -1 : 0;
  if (delta === 0) return;

  /* Coluna atual = aquela cujo centro está mais perto do centro do card. */
  const cardCenter = collisionRect.left + collisionRect.width / 2;
  let currentIndex = 0;
  let best = Infinity;

  BOARD_STATUSES.forEach((status, i) => {
    const rect = droppableRects.get(status);
    if (!rect) return;
    const distance = Math.abs(rect.left + rect.width / 2 - cardCenter);
    if (distance < best) {
      best = distance;
      currentIndex = i;
    }
  });

  const nextIndex = Math.min(Math.max(currentIndex + delta, 0), BOARD_STATUSES.length - 1);
  if (nextIndex === currentIndex) return;

  const target = droppableRects.get(BOARD_STATUSES[nextIndex]);
  if (!target) return;

  return { x: target.left + target.width / 2, y: collisionRect.top };
};
