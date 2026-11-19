import { describe, expect, it } from 'vitest';

import { trazoQrDecorativo } from '@/utils/codigoQrDecorativo';

const modulos = (trazo) => new Set(trazo.match(/M\d+ \d+/g));

describe('trazoQrDecorativo', () => {
  it('siempre dibuja lo mismo', () => {
    expect(trazoQrDecorativo()).toBe(trazoQrDecorativo());
  });

  it('dibuja los tres buscadores y deja libre el centro para el ícono', () => {
    const encendidos = modulos(trazoQrDecorativo());
    for (const esquina of ['M0 0', 'M22 0', 'M0 22', 'M3 3', 'M25 3', 'M3 25']) {
      expect(encendidos.has(esquina)).toBe(true);
    }
    expect(encendidos.has('M1 1')).toBe(false);
    expect(encendidos.has('M14 14')).toBe(false);
  });
});
