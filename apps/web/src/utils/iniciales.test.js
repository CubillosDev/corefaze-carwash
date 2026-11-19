import { describe, expect, it } from 'vitest';

import { iniciales } from '@/utils/iniciales';

describe('iniciales', () => {
  it('toma la primera letra de las dos primeras palabras', () => {
    expect(iniciales('Laura Jiménez Prueba')).toBe('LJ');
  });

  it('devuelve una sola letra si el nombre tiene una palabra', () => {
    expect(iniciales('  ana ')).toBe('A');
  });

  it('respeta las tildes y la eñe', () => {
    expect(iniciales('ñandú álvarez')).toBe('ÑÁ');
  });

  it('devuelve cadena vacía sin nombre', () => {
    expect(iniciales('')).toBe('');
    expect(iniciales(null)).toBe('');
  });
});
