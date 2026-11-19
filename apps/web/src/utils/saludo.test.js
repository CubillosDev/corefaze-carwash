import { describe, expect, it } from 'vitest';

import { saludoSegunHora } from '@/utils/saludo';

describe('saludoSegunHora', () => {
  it('saluda según la hora de Bogotá', () => {
    expect(saludoSegunHora('2026-08-03T08:00:00-05:00')).toBe('Buenos días');
    expect(saludoSegunHora('2026-08-03T12:00:00-05:00')).toBe('Buenas tardes');
    expect(saludoSegunHora('2026-08-03T18:59:00-05:00')).toBe('Buenas tardes');
    expect(saludoSegunHora('2026-08-03T19:00:00-05:00')).toBe('Buenas noches');
  });
});
