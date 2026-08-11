# Design system (`packages/ui`)

Como o pacote de UI é organizado e as armadilhas que ele evita de propósito.
Voltar para o [README](../README.md).

Consumido como fonte pelos dois apps, sem build step — igual a `packages/shared`.
Exporta primitivos, ícones, hooks, tokens de movimento e o preset do Tailwind.

**Cor em três camadas.** Rampas primitivas (`gov-blue-600`, `ink-500`) →
variáveis semânticas em `src/styles/tokens.css` → o mapa `colors` do preset, que
aponta para elas. Componente novo usa a camada 3 (`bg-surface`,
`text-content-secondary`); a camada 1 só aparece onde a cor é institucional e não
pode mudar com o tema, como a faixa gov.br. `tokens.css` é o único arquivo com
hex cru, e cada par tem o contraste anotado.

**Dark mode é tonal, não invertido.** Os quatro tokens de preenchimento
(accent/success/warn/danger) sobem para rungs claras no escuro, e por isso cada
um tem o seu `--text-on-*`: `text-white` em cima deles cairia para ~3:1.

**Movimento.** Durações e curvas em `src/lib/motion.ts`. Vale uma regra de
robustez: conteúdo não pode depender de animação para existir. O framer anima em
`requestAnimationFrame`, que o navegador suspende em aba oculta — enquanto isso
o estado `initial` continua aplicado, e um `opacity: 0` deixaria a tela em branco
sem erro nenhum. Entrada de conteúdo anima só `y`/`scale`; opacidade fica com as
sobreposições, que só existem porque o JS rodou.

**Duas armadilhas do Tailwind que o código evita de propósito:**

- O `content` do `tailwind.config.js` de cada app **precisa** varrer
  `../../packages/ui/src`. Sem isso todo primitivo renderiza sem estilo — sem
  erro, sem aviso.
- Nada de classe montada em runtime (`` `bg-${tone}` ``). O Tailwind varre o
  código como texto; classe interpolada não existe no CSS gerado. Use mapa de
  lookup com strings literais.

O `resolve.dedupe` nos dois `vite.config.ts` garante instância única de React e
framer-motion entre os apps e o pacote.
