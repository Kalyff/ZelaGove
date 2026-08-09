import { render, screen } from '@testing-library/react';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { riseIn, listContainer, pageSlide, scaleIn, fade } from '../src/lib/motion';

/**
 * Regressão de tela branca.
 *
 * O painel usava `AnimatePresence mode="wait"` com `initial={{ opacity: 0 }}`
 * na transição de rota. Na maioria das navegações o conteúdo montava inteiro —
 * dados carregados, mapa com tiles — e ficava preso em opacidade 0. Tela branca
 * até recarregar a página.
 *
 * A regra que evita a classe inteira do problema está em `src/lib/motion.ts`:
 * conteúdo não pode depender de animação para existir. Estes testes prendem a
 * regra ao código, porque ela é fácil de esquecer — foi escrita e violada na
 * mesma sessão.
 */

/** Variantes destinadas a CONTEÚDO: nunca podem começar invisíveis. */
const DE_CONTEUDO = { riseIn, listContainer, pageSlide: pageSlide(1) };

/** Variantes de SOBREPOSIÇÃO: podem usar opacidade à vontade — elas só existem
 *  porque o JS rodou, e um modal invisível não esconde conteúdo do usuário. */
const DE_SOBREPOSICAO = { scaleIn, fade };

describe('regra de robustez do movimento', () => {
  it.each(Object.entries(DE_CONTEUDO))(
    '`%s` não começa com opacidade zero',
    (_nome, variante) => {
      const inicial = (variante as Record<string, { opacity?: number }>).hidden;
      if (!inicial || inicial.opacity === undefined) return; // não mexe em opacidade: ok
      expect(inicial.opacity).toBeGreaterThan(0);
    },
  );

  it.each(Object.entries(DE_SOBREPOSICAO))(
    '`%s` PODE começar invisível (é sobreposição)',
    (_nome, variante) => {
      const inicial = (variante as Record<string, { opacity?: number }>).hidden;
      expect(inicial?.opacity).toBe(0);
    },
  );

  it('conteúdo permanece legível quando a animação não roda', () => {
    /* Sem `LazyMotion` as features não carregam e o `m` renderiza estático,
       congelado no estado `initial` — é o que acontece em aba oculta, onde o
       navegador suspende o requestAnimationFrame. O texto tem de estar lá. */
    render(
      <m.div variants={riseIn} initial="hidden" animate="show">
        Chamado 2026-0000123
      </m.div>,
    );
    const el = screen.getByText('Chamado 2026-0000123');
    expect(el).toBeVisible();
    expect(getComputedStyle(el).opacity).not.toBe('0');
  });

  it('sobreposição pode ficar invisível sem features — não esconde conteúdo', () => {
    render(
      <LazyMotion features={domAnimation}>
        <m.div variants={scaleIn} initial="hidden" animate="show">
          Detalhes
        </m.div>
      </LazyMotion>,
    );
    expect(screen.getByText('Detalhes')).toBeInTheDocument();
  });
});
