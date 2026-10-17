import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// jsdom no implementa matchMedia. Por defecto las pruebas simulan una pantalla
// de escritorio; la prueba que necesite otra lo reemplaza con vi.stubGlobal.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (consulta) => ({
    matches: false,
    media: consulta,
    addEventListener() {},
    removeEventListener() {},
  });
}

afterEach(() => {
  cleanup();
});
