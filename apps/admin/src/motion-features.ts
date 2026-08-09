/**
 * Existe só para ser alvo de `import()` dinâmico no `LazyMotion`.
 *
 * `domMax` e não `domAnimation`: o Kanban usa `layoutId` para o card voar entre
 * colunas, e layout animation não está no conjunto menor.
 */
export { domMax as default } from 'framer-motion';
