import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

// Enlace "Iniciar sesión" del menú (%VITE_PANEL_URL% en index.html). Es público.
process.env.VITE_PANEL_URL ??= 'http://localhost:5173/ingreso';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5175, strictPort: true },
  preview: { port: 4175, strictPort: true },
  build: {
    target: 'es2022',
    // Las fuentes nunca se incrustan en el CSS: el navegador solo descarga los
    // alfabetos que usa la página (unicode-range).
    assetsInlineLimit: (archivo) => (/\.woff2?$/.test(archivo) ? false : undefined),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
});
