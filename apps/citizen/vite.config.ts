import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Cache só do app shell. Cachear resposta da API aqui produz o pior bug
      // possível deste produto: o cidadão vendo status desatualizado do
      // próprio chamado. Se um dia entrar cache de dados, tem que ser
      // network-first com invalidação explícita.
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'] },
      manifest: {
        name: 'Zeladoria.gov',
        short_name: 'Zeladoria',
        description: 'Abra e acompanhe chamados de zeladoria urbana da sua cidade.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#FFFFFF',
        theme_color: '#1351B4',
        /**
         * Dois ARQUIVOS distintos, não o mesmo em dois papéis.
         *
         * O `maskable` é recortado pelo sistema — no Android vira círculo,
         * squircle ou o que a fabricante escolher. A marca é um quadrado
         * arredondado de cantos transparentes: servida como maskable, o recorte
         * comeria as bordas e sobraria o pino encostado na borda do círculo.
         *
         * Por isso o maskable tem fundo sangrando e o pino reduzido a 44% do
         * quadro, dentro da zona segura de 80% que todo formato de máscara
         * preserva. O `any` continua sendo a marca como desenhada.
         */
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@zeladoria/client': path.resolve(__dirname, '../../packages/client/src/index.ts'),
      '@zeladoria/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@zeladoria/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
    /**
     * `packages/ui` fica FORA da raiz deste app, então o Vite pode resolver o
     * framer-motion dele para uma instância diferente da que o app usa. Quando
     * isso acontece, o contexto do `<LazyMotion>` montado aqui não alcança os
     * componentes `m` de lá: eles renderizam presos no estado `initial` —
     * opacidade 0 — e a interface fica invisível, sem erro nenhum no console.
     * O mesmo vale para o React (dois reconciliadores, hooks quebrados).
     */
    dedupe: ['react', 'react-dom', 'framer-motion'],
  },
  server: {
    port: 5173,
    // Domínio do ngrok muda a cada execução — sem isso o Vite 5 recusa o Host.
    allowedHosts: true,
    proxy: { '/api': { target: 'http://localhost:3333', changeOrigin: true } },
  },
});
