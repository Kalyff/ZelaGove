import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    // Testes de integração compartilham um banco: rodar em paralelo faria um
    // truncar os dados do outro no meio da execução.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
