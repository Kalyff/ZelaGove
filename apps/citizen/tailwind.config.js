import preset from '../../packages/ui/tailwind.preset.js';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // Sem esta linha, TODA classe vinda de packages/ui é purgada e os
    // primitivos renderizam sem estilo — sem erro, sem aviso.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Só o que é exclusivo deste app. Cores, fontes, radius e o resto das
      // sombras vêm do preset.
      boxShadow: {
        device: '0 24px 60px -20px rgba(7, 29, 65, 0.45)',
        fab: '0 10px 24px -6px rgba(22, 136, 33, 0.6)',
      },
    },
  },
  plugins: [],
};
