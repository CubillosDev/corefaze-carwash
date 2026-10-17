import { describe, expect, it } from 'vitest';

import { formatoFecha, formatoFechaHora } from '@/utils/formatoFecha';

/** Lee una fecha en Bogotá igual que lo hace la aplicación al mostrarla. */
const enBogota = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

describe('formatoFecha', () => {
  it('formatea una fecha ISO sin hora como dd/mm/aaaa', () => {
    expect(formatoFecha('2026-08-03')).toBe('03/08/2026');
    expect(formatoFecha('2026-01-01')).toBe('01/01/2026');
    expect(formatoFecha('2026-12-31')).toBe('31/12/2026');
  });

  it('no corre el día hacia atrás por interpretar la fecha en UTC', () => {
    // new Date('2026-08-03') es medianoche UTC; visto desde Bogotá (UTC-5) eso
    // cae el 2 de agosto. Esta es la trampa que formatoFecha debe evitar.
    const trampaUtc = enBogota.format(new Date('2026-08-03'));

    expect(trampaUtc).toBe('02/08/2026');
    expect(formatoFecha('2026-08-03')).toBe('03/08/2026');
    expect(formatoFecha('2026-08-03')).not.toBe(trampaUtc);
  });

  it('lleva una fecha con hora a la zona horaria de Bogotá', () => {
    expect(formatoFecha('2026-08-03T14:30:00-05:00')).toBe('03/08/2026');
    // 02:00 UTC del 4 son las 21:00 del 3 en Bogotá.
    expect(formatoFecha('2026-08-04T02:00:00Z')).toBe('03/08/2026');
  });

  it('acepta un objeto Date', () => {
    expect(formatoFecha(new Date('2026-08-03T14:30:00-05:00'))).toBe('03/08/2026');
  });

  it('devuelve cadena vacía cuando no hay una fecha utilizable', () => {
    expect(formatoFecha(null)).toBe('');
    expect(formatoFecha(undefined)).toBe('');
    expect(formatoFecha('')).toBe('');
    expect(formatoFecha('   ')).toBe('');
    expect(formatoFecha('ayer')).toBe('');
    expect(formatoFecha('2026-13-45')).toBe('');
    expect(formatoFecha(new Date('no es fecha'))).toBe('');
  });
});

describe('formatoFechaHora', () => {
  it('formatea fecha y hora en reloj de 12 horas', () => {
    expect(formatoFechaHora('2026-08-03T14:30:00-05:00')).toBe('03/08/2026 2:30 p. m.');
    expect(formatoFechaHora('2026-08-03T09:05:00-05:00')).toBe('03/08/2026 9:05 a. m.');
  });

  it('convierte una marca en UTC a la hora de Bogotá', () => {
    expect(formatoFechaHora('2026-08-03T19:30:00Z')).toBe('03/08/2026 2:30 p. m.');
  });

  it('usa espacios normales en el indicador a. m. / p. m.', () => {
    const resultado = formatoFechaHora('2026-08-03T14:30:00-05:00');

    expect(resultado).not.toContain('\u00a0');
    expect(resultado).not.toContain('\u202f');
  });

  it('ancla una fecha sin hora a la medianoche de Bogotá', () => {
    expect(formatoFechaHora('2026-08-03')).toBe('03/08/2026 12:00 a. m.');
  });

  it('devuelve cadena vacía cuando no hay una fecha utilizable', () => {
    expect(formatoFechaHora(null)).toBe('');
    expect(formatoFechaHora('ayer')).toBe('');
  });
});
