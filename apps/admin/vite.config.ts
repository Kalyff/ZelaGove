import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@zeladoria/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@zeladoria/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    },
    /** Ver a nota em apps/citizen/vite.config.ts — instância única de
     *  framer-motion e React entre o app e packages/ui. */
    dedupe: ['react', 'react-dom', 'framer-motion'],
  },
  server: { port: 5174 },
});
