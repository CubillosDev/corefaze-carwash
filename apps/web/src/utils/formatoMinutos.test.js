import { describe, expect, it } from 'vitest';

import { formatoMinutos, minutosDesde } from '@/utils/formatoMinutos';

describe('formatoMinutos', () => {
  it('muestra minutos y, desde una hora, horas y minutos', () => {
    expect(formatoMinutos(42)).toBe('42 min');
    expect(formatoMinutos(65)).toBe('1h 5m');
    expect(formatoMinutos(-3)).toBe('0 min');
  });
});

describe('minutosDesde', () => {
  it('cuenta los minutos completos hasta el instante dado', () => {
    const ahora = Date.parse('2026-11-19T15:45:30Z');
    expect(minutosDesde('2026-11-19T15:00:00Z', ahora)).toBe(45);
    expect(minutosDesde('no es fecha', ahora)).toBe(0);
  });
});
