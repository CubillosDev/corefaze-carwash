import { describe, expect, it } from 'vitest';

import { formatoTelefono } from '@/utils/formatoTelefono';

describe('formatoTelefono', () => {
  it('agrupa los diez dígitos en 3, 3 y 4', () => {
    expect(formatoTelefono('3000000001')).toBe('300 000 0001');
  });

  it('deja tal cual lo que no tiene diez dígitos', () => {
    expect(formatoTelefono('12345')).toBe('12345');
    expect(formatoTelefono(null)).toBe('');
  });
});
