const {
  fechaDeHoyEnBogota,
  sumarDias,
  diasDelRango,
  fechasDelRango,
} = require('../../../src/utils/fechaNegocio');

describe('fechaNegocio', () => {
  test('hoy se calcula en Bogotá, no en UTC', () => {
    // 00:30 UTC del 16 = 7:30 p. m. del 15 en Bogotá.
    expect(fechaDeHoyEnBogota(new Date('2026-01-16T00:30:00Z'))).toBe('2026-01-15');
  });

  test('suma y resta días cruzando meses y años', () => {
    expect(sumarDias('2026-01-31', 1)).toBe('2026-02-01');
    expect(sumarDias('2026-01-01', -1)).toBe('2025-12-31');
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29');
  });

  test('cuenta los días del rango incluyendo ambos extremos', () => {
    expect(diasDelRango('2026-11-01', '2026-11-01')).toBe(1);
    expect(diasDelRango('2026-11-01', '2026-11-07')).toBe(7);
  });

  test('lista las fechas del rango en orden', () => {
    expect(fechasDelRango('2026-11-29', '2026-12-02')).toEqual([
      '2026-11-29',
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
    ]);
    expect(fechasDelRango('2026-11-02', '2026-11-01')).toEqual([]);
  });
});
