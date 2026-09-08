# Design system (`packages/ui`)

Como o pacote de UI é organizado e as armadilhas que ele evita de propósito.
Voltar para o [README](../README.md).

Consumido como fonte pelos dois apps, sem build step — igual a
`packages/shared` e `packages/client`. Exporta primitivos, ícones, hooks, tokens
de movimento e o preset do Tailwind.

**O que NÃO é daqui.** Este pacote responde por como as coisas aparecem. Valor
de domínio, validação e a forma das respostas da API são de `packages/shared`;
transporte HTTP e sessão são de `packages/client`. A fronteira importa: um
componente que buscasse dado sozinho amarraria o design system à API e deixaria
de ser testável isoladamente.

**Mapas por status têm dono único** (`src/domain/`). `STATUS_ICON`,
`STATUS_CHIP`, `STATUS_TIMELINE_NODE`, `STATUS_HEX` e os tokens do mapa saem
todos daqui. O ícone por status já esteve copiado em três arquivos, e a
consequência apareceu: as linhas do tempo distinguiam só "concluído" de todo o
resto, então pendente e em deslocamento apareciam idênticos enquanto o chip ao
lado os mostrava em cores diferentes.

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
