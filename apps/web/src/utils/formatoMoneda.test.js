import { describe, expect, it } from 'vitest';

import { formatoMoneda } from '@/utils/formatoMoneda';

describe('formatoMoneda', () => {
  it('formatea un entero de pesos con separador de miles y sin decimales', () => {
    expect(formatoMoneda(28000)).toBe('$ 28.000');
    expect(formatoMoneda(1234567)).toBe('$ 1.234.567');
    expect(formatoMoneda(999)).toBe('$ 999');
    expect(formatoMoneda(0)).toBe('$ 0');
  });

  it('separa el símbolo con un espacio normal y no con uno duro', () => {
    const resultado = formatoMoneda(28000);

    expect(resultado).not.toContain('\u00a0');
    expect(resultado).not.toContain('\u202f');
    expect(resultado.charCodeAt(1)).toBe(32);
  });

  it('formatea valores negativos', () => {
    expect(formatoMoneda(-28000)).toBe('-$ 28.000');
  });

  it('redondea al peso más cercano si llega un decimal', () => {
    expect(formatoMoneda(28000.4)).toBe('$ 28.000');
    expect(formatoMoneda(28000.6)).toBe('$ 28.001');
    expect(formatoMoneda(-0.4)).toBe('$ 0');
  });

  it('acepta el valor como cadena', () => {
    expect(formatoMoneda('28000')).toBe('$ 28.000');
  });

  it('muestra $ 0 cuando el valor no es un número utilizable', () => {
    expect(formatoMoneda(null)).toBe('$ 0');
    expect(formatoMoneda(undefined)).toBe('$ 0');
    expect(formatoMoneda('veintiocho mil')).toBe('$ 0');
    expect(formatoMoneda(Number.NaN)).toBe('$ 0');
    expect(formatoMoneda(Number.POSITIVE_INFINITY)).toBe('$ 0');
  });
});
