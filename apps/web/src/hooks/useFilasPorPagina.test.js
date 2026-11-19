import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFilasPorPagina } from '@/hooks/useFilasPorPagina';

let angosta = false;

beforeEach(() => {
  angosta = false;
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return angosta;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function conAlto(alto) {
  vi.stubGlobal('innerHeight', alto);
}

describe('useFilasPorPagina', () => {
  it('calcula las filas que caben después de lo reservado', () => {
    conAlto(900);
    const { result } = renderHook(() => useFilasPorPagina());
    expect(result.current).toBe(10);
  });

  it('respeta el mínimo y el máximo', () => {
    conAlto(500);
    expect(renderHook(() => useFilasPorPagina()).result.current).toBe(6);

    conAlto(1440);
    expect(renderHook(() => useFilasPorPagina()).result.current).toBe(11);
  });

  it('usa un número fijo en pantalla angosta', () => {
    angosta = true;
    conAlto(1200);
    expect(renderHook(() => useFilasPorPagina({ enAngosta: 8 })).result.current).toBe(8);
  });

  it('se recalcula al cambiar el alto de la ventana', () => {
    conAlto(768);
    const { result } = renderHook(() => useFilasPorPagina({ reservado: 300, altoFila: 50 }));
    expect(result.current).toBe(9);

    conAlto(1080);
    act(() => window.dispatchEvent(new Event('resize')));
    expect(result.current).toBe(11);
  });
});
