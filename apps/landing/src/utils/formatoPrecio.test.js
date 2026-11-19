import { describe, expect, it } from 'vitest';

import { formatoPrecio } from '@/utils/formatoPrecio';

describe('formatoPrecio', () => {
  it('muestra el precio mensual con separador de miles', () => {
    expect(formatoPrecio(149000, false)).toBe('$149.000');
    expect(formatoPrecio(279000, false)).toBe('$279.000');
  });

  it('aplica el 15 % anual y redondea a miles', () => {
    expect(formatoPrecio(149000, true)).toBe('$127.000');
    expect(formatoPrecio(279000, true)).toBe('$237.000');
  });
});
