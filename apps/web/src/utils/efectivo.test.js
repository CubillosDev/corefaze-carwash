import { describe, expect, it } from 'vitest';

import { calcularCambio, leerMonto, montosRapidos } from '@/utils/efectivo';

describe('efectivo', () => {
  it('calcula el cambio, o lo que falta, y nada si no hay monto', () => {
    expect(calcularCambio(50000, 22000)).toBe(28000);
    expect(calcularCambio(20000, 22000)).toBe(-2000);
    expect(calcularCambio(null, 22000)).toBeNull();
  });

  it('propone el exacto y los redondeos hacia arriba, sin repetir', () => {
    expect(montosRapidos(22000)).toEqual([22000, 30000, 50000, 100000]);
    expect(montosRapidos(50000)).toEqual([50000, 100000, 200000]);
    expect(montosRapidos(490000)).toEqual([490000, 500000]);
  });

  it('lee lo escrito en un campo de dinero', () => {
    expect(leerMonto('$ 28.000')).toBe(28000);
    expect(leerMonto('')).toBeNull();
    expect(leerMonto('abc')).toBeNull();
  });
});
