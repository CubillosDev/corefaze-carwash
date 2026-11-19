import { describe, expect, it } from 'vitest';

import { quincenaAnterior, quincenaDe } from '@/utils/quincena';

describe('quincena', () => {
  it('ubica la fecha en la primera o la segunda quincena del mes', () => {
    expect(quincenaDe('2026-11-01')).toEqual({ inicio: '2026-11-01', fin: '2026-11-15' });
    expect(quincenaDe('2026-11-15')).toEqual({ inicio: '2026-11-01', fin: '2026-11-15' });
    expect(quincenaDe('2026-11-16')).toEqual({ inicio: '2026-11-16', fin: '2026-11-30' });
  });

  it('termina la segunda quincena el último día de cada mes', () => {
    expect(quincenaDe('2026-12-31')).toEqual({ inicio: '2026-12-16', fin: '2026-12-31' });
    expect(quincenaDe('2026-02-20')).toEqual({ inicio: '2026-02-16', fin: '2026-02-28' });
    expect(quincenaDe('2028-02-29')).toEqual({ inicio: '2028-02-16', fin: '2028-02-29' });
  });

  it('da la quincena anterior, también cruzando el año', () => {
    expect(quincenaAnterior({ inicio: '2026-11-16' })).toEqual({ inicio: '2026-11-01', fin: '2026-11-15' });
    expect(quincenaAnterior({ inicio: '2026-01-01' })).toEqual({ inicio: '2025-12-16', fin: '2025-12-31' });
  });
});
