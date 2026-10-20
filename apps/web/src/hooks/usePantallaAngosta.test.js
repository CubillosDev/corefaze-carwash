import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CONSULTA_PANTALLA_ANGOSTA, usePantallaAngosta } from '@/hooks/usePantallaAngosta';

// Vitest no procesa CSS, así que el archivo se lee tal cual desde el disco,
// relativo a la raíz de apps/web (donde corre Vitest).
const RUTA_ESTILOS = resolve(process.cwd(), 'src/styles/global.css');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePantallaAngosta', () => {
  it('usa el mismo punto de quiebre que --breakpoint-escritorio en global.css', () => {
    const estilos = readFileSync(RUTA_ESTILOS, 'utf8');
    const [, valor] = estilos.match(/--breakpoint-escritorio:\s*([^;]+);/);

    expect(CONSULTA_PANTALLA_ANGOSTA).toBe(`(width < ${valor.trim()})`);
  });

  it('refleja la consulta y se actualiza cuando cambia el ancho', () => {
    const oyentes = new Set();
    let coincide = false;
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return coincide;
      },
      addEventListener: (_tipo, oyente) => oyentes.add(oyente),
      removeEventListener: (_tipo, oyente) => oyentes.delete(oyente),
    }));

    const { result, unmount } = renderHook(() => usePantallaAngosta());
    expect(result.current).toBe(false);

    coincide = true;
    act(() => oyentes.forEach((oyente) => oyente()));
    expect(result.current).toBe(true);

    unmount();
    expect(oyentes.size).toBe(0);
  });
});
