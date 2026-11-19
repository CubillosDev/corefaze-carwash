import { describe, expect, it } from 'vitest';

import { proximoCorte } from '@/utils/fechaCorte';

describe('proximoCorte', () => {
  it('es este mes si el día aún no pasa', () => {
    expect(proximoCorte(15, '2026-11-10')).toBe('2026-11-15');
    expect(proximoCorte(15, '2026-11-15')).toBe('2026-11-15');
  });

  it('pasa al mes siguiente y al año siguiente', () => {
    expect(proximoCorte(5, '2026-11-19')).toBe('2026-12-05');
    expect(proximoCorte(5, '2026-12-19')).toBe('2027-01-05');
  });

  it('ajusta el día a meses más cortos', () => {
    expect(proximoCorte(31, '2026-11-19')).toBe('2026-11-30');
    expect(proximoCorte(30, '2027-02-01')).toBe('2027-02-28');
  });
});
