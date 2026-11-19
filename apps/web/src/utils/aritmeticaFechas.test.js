import { describe, expect, it } from 'vitest';

import { diaCortoDeLaSemana, primerDiaDelMes, sumarDias } from '@/utils/aritmeticaFechas';

describe('aritmeticaFechas', () => {
  it('suma y resta días cruzando meses y años', () => {
    expect(sumarDias('2026-11-30', 1)).toBe('2026-12-01');
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31');
    expect(sumarDias('2026-11-19', -6)).toBe('2026-11-13');
  });

  it('da el primer día del mes', () => {
    expect(primerDiaDelMes('2026-11-19')).toBe('2026-11-01');
  });

  it('da el día de la semana abreviado en español', () => {
    expect(diaCortoDeLaSemana('2026-11-19')).toBe('jue');
    expect(diaCortoDeLaSemana('2026-11-22')).toBe('dom');
  });
});
