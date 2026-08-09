import plugin from 'tailwindcss/plugin';

/**
 * Preset compartilhado pelos dois apps.
 *
 * Três camadas, nesta ordem:
 *   1. rampas primitivas (`gov-*`, `ink-*`)  — valores fixos, não mudam com o tema
 *   2. variáveis semânticas (`styles/tokens.css`) — trocam em `.dark`
 *   3. o mapa `colors` abaixo, que aponta para as variáveis da camada 2
 *
 * Componente novo consome a camada 3 (`bg-surface`, `text-content-secondary`).
 * A camada 1 só aparece onde a cor é institucional de verdade e não pode mudar
 * com o tema — a faixa gov.br, o hex dos pontos do mapa.
 *
 * Toda cor da camada 1 exige a rung explícita (`gov-blue-600`, e não
 * `gov-blue`). Não há mais atalho sem número: o Tailwind descarta classe de cor
 * desconhecida EM SILÊNCIO, então um atalho digitado errado sumiria sem erro.
 *
 * @type {import('tailwindcss').Config}
 */
export default {
  darkMode: 'class',
  content: [],
  theme: {
    extend: {
      colors: {
        gov: {
          /* Âncoras institucionais preservadas exatas:
             blue-600, blue-900, green-600, yellow-400. */
          blue: {
            50: '#EFF5FF',
            100: '#E8EEFA',
            200: '#C7D9F5',
            300: '#9BBAEC', //  texto em dark — 9,48:1 sobre #0B1220
            400: '#5B8FDD', //  borda/botão em dark — 5,72:1
            500: '#2E6BCB',
            600: '#1351B4', //  ÂNCORA — 7,33:1 no branco (AAA)
            700: '#0F4292',
            800: '#0B3170',
            900: '#071D41', //  ÂNCORA — 16,65:1 no branco
            950: '#04122A',
          },
          green: {
            50: '#EBF7EC',
            /* O `gov-green-soft` que nunca existiu. Sem ele o chip "Concluído"
               caía no `bg-green-50` do Tailwind puro, quebrando a simetria com
               os chips de pendente e em andamento. */
            100: '#D2EED6',
            200: '#A7DCAE',
            300: '#6FC57B',
            400: '#3FA84F',
            500: '#22962F',
            600: '#168821', //  ÂNCORA — 4,59:1 no branco (AA)
            /* O texto do chip usa 700, não 600: #168821 sobre green-100 fica
               em 3,70:1 e reprova. */
            700: '#0F6B19',
            800: '#0B5213',
            900: '#07380D',
          },
          amber: {
            50: '#FEF6E7',
            100: '#FDF3D8',
            200: '#FAE3A8',
            300: '#F5C863', //  âmbar de dark mode — 11,9:1
            400: '#E8A317',
            500: '#D07C08',
            600: '#B54708', //  5,43:1 no branco · 4,91:1 sobre amber-100
            700: '#93380A',
            800: '#742D0B',
            900: '#4E1F08',
          },
          /* Amarelo é institucional/decorativo.
             O 400 tem 1,50:1 no branco — NUNCA como texto em fundo claro.
             Sobre blue-900 dá 11,09:1, que é por que o "gov.br" da sidebar
             funciona. O único amarelo legível como texto em fundo claro é o 700. */
          yellow: {
            50: '#FFFBEA',
            100: '#FFF3C4',
            200: '#FCE588',
            300: '#FADB5F',
            400: '#FFCD07', //  ÂNCORA
            500: '#E0B006',
            600: '#B88A05',
            700: '#8F6A04', //  4,96:1 no branco
            800: '#6B4E03',
            900: '#4A3502',
          },
          /* Vermelho é EXCLUSIVO de erro de sistema. Nunca status de chamado —
             "Pendente" é âmbar em toda superfície, inclusive no mapa.
             Ver `domain/statusTokens.ts`. */
          red: {
            50: '#FEF0EE',
            100: '#FCDAD5',
            200: '#F8B0A6',
            300: '#F27F6E', //  dark — 7,16:1
            400: '#EC4B33',
            500: '#E52207',
            600: '#C41C06',
            700: '#9E1705', //  texto de erro em fundo claro — 7,33:1 sobre red-50
            800: '#7A1104',
            900: '#530C03',
          },
        },

        /* Neutro azulado. Substitui todo `slate-*`, que era frio demais ao lado
           do azul institucional e cujo 400 reprovava contraste (2,56:1). */
        ink: {
          0: '#FFFFFF',
          50: '#F7F9FC',
          100: '#EEF2F7',
          200: '#DDE4ED',
          300: '#C3CEDD',
          400: '#93A2B8',
          450: '#8494AC',
          500: '#64748B',
          600: '#48566B',
          700: '#33415A',
          800: '#1F2B42',
          900: '#0F1A2E',
        },

        /* Camada 3 — semântica. É isto que os componentes usam. */
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          sunken: 'var(--surface-sunken)',
          inverse: 'var(--surface-inverse)',
        },
        content: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
          /* Só para não-texto: ícone grande de estado vazio, régua, divisória.
             2,6:1 — reprova para qualquer texto. */
          decor: 'var(--decor)',
        },
        line: {
          DEFAULT: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        /* Os quatro tokens de PREENCHIMENTO têm `on` próprio: no escuro eles
           sobem para as rungs claras, e `text-white` em cima deles cai para
           ~3:1. Ver os pares medidos em styles/tokens.css. */
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          soft: 'var(--accent-soft)',
          on: 'var(--text-on-accent)',
          onSoft: 'var(--accent-on-soft)',
        },
        success: {
          DEFAULT: 'var(--success)',
          soft: 'var(--success-soft)',
          onSoft: 'var(--success-on-soft)',
          on: 'var(--text-on-success)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          soft: 'var(--warn-soft)',
          onSoft: 'var(--warn-on-soft)',
          on: 'var(--text-on-warn)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
          onSoft: 'var(--danger-on-soft)',
          on: 'var(--text-on-danger)',
        },
        stripe: {
          a: 'var(--stripe-a)',
          b: 'var(--stripe-b)',
        },
        /* Texto sobre chrome escuro (sidebar, capa do Gateway). Não inverte com
           o tema — essas superfícies são escuras nos dois. */
        chrome: {
          DEFAULT: 'var(--text-chrome)',
          secondary: 'var(--text-chrome-secondary)',
          tertiary: 'var(--text-chrome-tertiary)',
        },
      },

      fontFamily: {
        display: ['Raleway', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },

      borderRadius: {
        field: '0.75rem',
        card: '1rem',
        panel: '1.25rem',
        device: '2rem',
      },

      boxShadow: {
        card: '0 1px 2px 0 rgb(7 29 65 / 0.04), 0 1px 3px 0 rgb(7 29 65 / 0.06)',
        panel: '0 10px 30px -12px rgb(7 29 65 / 0.25)',
        lift: '0 18px 40px -14px rgb(7 29 65 / 0.40)',
        device: '0 24px 60px -20px rgb(7 29 65 / 0.45)',
        fab: '0 10px 24px -6px rgb(22 136 33 / 0.60)',
      },

      ringColor: { DEFAULT: 'var(--ring)' },
      ringOffsetColor: { DEFAULT: 'var(--ring-offset)' },

      spacing: {
        safe: 'var(--safe-b)',
        'safe-t': 'var(--safe-t)',
      },

      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },

  plugins: [
    /**
     * Camada base compartilhada.
     *
     * Vai como plugin, não como arquivo `@import`ado: o `postcss-import` não
     * está no pipeline dos apps, então um `@layer base` dentro de um CSS
     * importado não teria garantia de ser processado pelo Tailwind. Como
     * plugin, entra na camada base de qualquer config que use este preset.
     */
    plugin(({ addBase }) => {
      addBase({
        html: { WebkitTapHighlightColor: 'transparent' },

        /* Anel de foco de 3px — o anterior era 2px, abaixo do que o brief de
           Inclusive Design pede. O offset usa a variável do tema para o anel
           não sumir contra superfície escura. */
        ':focus-visible': {
          outline: 'none',
          boxShadow: '0 0 0 2px var(--ring-offset), 0 0 0 5px var(--ring)',
        },

        /**
         * Reduced motion.
         *
         * Cobre os `transition-*` e `animate-*` do Tailwind. NÃO alcança o
         * framer-motion, que anima por style inline / WAAPI — para ele o
         * mecanismo é `<MotionConfig reducedMotion="user">` no root de cada
         * app. Os dois convivem; não é redundância.
         *
         * O Leaflet fica clampado DE PROPÓSITO: pan e zoom instantâneos são o
         * comportamento correto sob reduced motion. Não abrir exceção.
         */
        '@media (prefers-reduced-motion: reduce)': {
          '*, *::before, *::after': {
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
            scrollBehavior: 'auto !important',
          },
        },
      });
    }),
  ],
};
