/**
 * Existe só para ser alvo de `import()` dinâmico no `LazyMotion`.
 *
 * Passar `domAnimation` direto (síncrono) não divide nada: as features entram
 * no chunk principal e o LazyMotion vira decoração. Num módulo separado, o
 * Rollup consegue mandá-las para um chunk próprio, carregado depois do primeiro
 * paint — que é o ponto de um PWA municipal que pode abrir em 3G.
 */
export { domAnimation as default } from 'framer-motion';
