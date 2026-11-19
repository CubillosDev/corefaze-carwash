import { describe, expect, it } from 'vitest';

import { validarRegistro } from '@/features/autenticacion/validators/registro.schema';

const VALIDO = { nombre: '  Ana   Prueba ', email: ' ana@ejemplo.com ', password: 'clave-segura-1', confirmacion: 'clave-segura-1' };

describe('validarRegistro', () => {
  it('acepta una solicitud completa y limpia el nombre y el correo', () => {
    const resultado = validarRegistro(VALIDO);
    expect(resultado.valido).toBe(true);
    expect(resultado.datos).toEqual({ nombre: 'Ana Prueba', email: 'ana@ejemplo.com', password: 'clave-segura-1' });
  });

  it('pide nombre, correo válido y una contraseña de 10 a 72 caracteres', () => {
    const { errores } = validarRegistro({ nombre: 'A', email: 'ana@', password: 'corta', confirmacion: 'corta' });
    expect(errores.nombre).toBe('Escribe tu nombre completo.');
    expect(errores.email).toMatch(/correo válido/);
    expect(errores.password).toBe('Usa al menos 10 caracteres.');

    expect(validarRegistro({ ...VALIDO, password: 'x'.repeat(73), confirmacion: 'x'.repeat(73) }).errores.password).toBe(
      'Máximo 72 caracteres.',
    );
  });

  it('exige que la confirmación coincida', () => {
    expect(validarRegistro({ ...VALIDO, confirmacion: 'otra-clave-1' }).errores.confirmacion).toBe('Las contraseñas no coinciden.');
  });
});
