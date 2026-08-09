import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * `true` quando o usuário pediu menos movimento no sistema.
 *
 * Implementado com `matchMedia` direto, sem depender do `useReducedMotion` do
 * framer-motion: o `<MotionConfig reducedMotion="user">` já cobre o caso
 * declarativo. Este hook existe para o que é imperativo e a config não alcança
 * — a contagem crescente dos KPIs e o traço do check SVG, que precisam pular
 * direto para o valor final em vez de animar.
 */
export function useReducedMotionSafe(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
