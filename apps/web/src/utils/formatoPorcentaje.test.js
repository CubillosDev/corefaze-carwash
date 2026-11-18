import { describe, expect, it } from 'vitest';

import { formatoPorcentaje } from '@/utils/formatoPorcentaje';

describe('formatoPorcentaje', () => {
  it('convierte la fracción en porcentaje con espacio antes del signo', () => {
    expect(formatoPorcentaje(0.4)).toBe('40 %');
    expect(formatoPorcentaje(0.37)).toBe('37 %');
    expect(formatoPorcentaje(0.375)).toBe('37,5 %');
    expect(formatoPorcentaje(1)).toBe('100 %');
  });

  it('muestra 0 % cuando no hay un número', () => {
    expect(formatoPorcentaje(null)).toBe('0 %');
    expect(formatoPorcentaje('x')).toBe('0 %');
  });
});
