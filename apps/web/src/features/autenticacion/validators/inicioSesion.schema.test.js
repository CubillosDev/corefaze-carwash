import { describe, expect, it } from 'vitest';

import { validarInicioSesion } from '@/features/autenticacion/validators/inicioSesion.schema';

describe('validarInicioSesion', () => {
  it('acepta un correo y una contraseña y recorta los espacios del correo', () => {
    const resultado = validarInicioSesion({ email: '  ana@prueba.com ', password: 'x' });

    expect(resultado.valido).toBe(true);
    expect(resultado.errores).toEqual({});
    expect(resultado.datos).toEqual({ email: 'ana@prueba.com', password: 'x' });
  });

  it('pide ambos campos cuando están vacíos', () => {
    const resultado = validarInicioSesion({});

    expect(resultado.valido).toBe(false);
    expect(resultado.errores.email).toMatch(/correo/i);
    expect(resultado.errores.password).toMatch(/contraseña/i);
  });

  it('rechaza un correo con formato inválido', () => {
    for (const email of ['ana', 'ana@', '@prueba.com', 'ana@prueba', 'a na@prueba.com']) {
      expect(validarInicioSesion({ email, password: 'x' }).errores.email, email).toBeDefined();
    }
  });

  it('no recorta ni altera la contraseña', () => {
    expect(validarInicioSesion({ email: 'a@b.co', password: '  clave con espacios ' }).datos.password).toBe(
      '  clave con espacios ',
    );
  });
});
