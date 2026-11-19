import { describe, expect, it } from 'vitest';

import { curvaAcumulada, etiquetaDeHora, variacionALaHora } from '@/utils/curvaAcumulada';

describe('curvaAcumulada', () => {
  it('acumula por hora de 7 a 18 y corta la jornada en la hora actual', () => {
    const curva = curvaAcumulada({
      horas: [
        { hora: 8, ingresos: 30000 },
        { hora: 10, ingresos: 50000 },
      ],
      horasAnteriores: [
        { hora: 7, ingresos: 20000 },
        { hora: 9, ingresos: 40000 },
        { hora: 15, ingresos: 100000 },
      ],
      horaActual: 10,
    });

    expect(curva.horas).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(curva.hoy.slice(0, 5)).toEqual([0, 30000, 30000, 80000, null]);
    expect(curva.total).toBe(80000);
    expect(curva.anteriorALaHora).toBe(60000);
    expect(curva.totalAnterior).toBe(160000);
  });

  it('amplía el horario si hubo ventas por fuera de 7 a 18', () => {
    const curva = curvaAcumulada({ horas: [{ hora: 6, ingresos: 1000 }, { hora: 20, ingresos: 2000 }], horasAnteriores: null, horaActual: 23 });
    expect(curva.horas[0]).toBe(6);
    expect(curva.horas.at(-1)).toBe(20);
    expect(curva.anterior).toBeNull();
    expect(curva.total).toBe(3000);
  });

  it('antes de abrir no hay ventas acumuladas a la hora', () => {
    const curva = curvaAcumulada({ horas: [], horasAnteriores: [{ hora: 9, ingresos: 5000 }], horaActual: 5 });
    expect(curva.hoy.every((valor) => valor === null)).toBe(true);
    expect(curva.anteriorALaHora).toBe(0);
  });
});

describe('variacionALaHora', () => {
  it('compara con lo que llevaba la jornada anterior a la misma hora', () => {
    expect(variacionALaHora({ total: 120000, anteriorALaHora: 100000 })).toBe(20);
    expect(variacionALaHora({ total: 90000, anteriorALaHora: 100000 })).toBe(-10);
    expect(variacionALaHora({ total: 90000, anteriorALaHora: 0 })).toBeNull();
    expect(variacionALaHora(null)).toBeNull();
  });
});

describe('etiquetaDeHora', () => {
  it('usa el reloj de 12 horas con el periodo solo donde se pide', () => {
    expect(etiquetaDeHora(7, true)).toBe('7 a. m.');
    expect(etiquetaDeHora(9, false)).toBe('9');
    expect(etiquetaDeHora(13, true)).toBe('1 p. m.');
    expect(etiquetaDeHora(12, false)).toBe('12');
  });
});
