import { describe, expect, it } from 'vitest';

import { errorDeCorreo, errorDeLongitud, errorDeTelefono, soloErrores } from '@/utils/validaciones';

describe('validaciones de formato', () => {
  it('controla la longitud y si el campo es obligatorio', () => {
    expect(errorDeLongitud('', { min: 3, max: 10 }, 'El nombre')).toBe('El nombre es obligatorio.');
    expect(errorDeLongitud('', { max: 10 }, 'La nota', { obligatorio: false })).toBeUndefined();
    expect(errorDeLongitud('ab', { min: 3, max: 10 }, 'El nombre')).toMatch(/entre 3 y 10/);
    expect(errorDeLongitud('abcd', { max: 3 }, 'La nota')).toMatch(/superar los 3/);
    expect(errorDeLongitud('abc', { min: 3, max: 10 }, 'El nombre')).toBeUndefined();
  });

  it('exige teléfonos solo con la cantidad de dígitos del contrato', () => {
    expect(errorDeTelefono('3001234567', 10)).toBeUndefined();
    expect(errorDeTelefono('300 123 456', 10)).toBeTruthy();
  });

  it('acepta correo vacío o con forma válida', () => {
    expect(errorDeCorreo('')).toBeUndefined();
    expect(errorDeCorreo('ana@prueba.co')).toBeUndefined();
    expect(errorDeCorreo('ana@')).toBeTruthy();
  });

  it('deja solo los errores definidos', () => {
    expect(soloErrores({ a: undefined, b: 'Falta' })).toEqual({ b: 'Falta' });
  });
});
