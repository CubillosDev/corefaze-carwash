import { describe, expect, it } from 'vitest';

import { LIMITES } from '@/constants/dominio';
import { validarCliente, VALORES_INICIALES_CLIENTE } from '@/features/clientes/validators/cliente.schema';

const VALIDO = {
  ...VALORES_INICIALES_CLIENTE,
  nombre: ' Cliente Prueba ',
  documento: '1000000001',
  telefono: '3000000001',
};

describe('validarCliente', () => {
  it('arma el cuerpo con los textos recortados y sin correo vacío', () => {
    const { valido, datos } = validarCliente(VALIDO);

    expect(valido).toBe(true);
    expect(datos).toEqual({
      nombre: 'Cliente Prueba',
      documento: '1000000001',
      tipo: 'particular',
      telefono: '3000000001',
      creditoHabilitado: false,
      estado: 'activo',
    });
  });

  it('usa los límites del contrato para nombre, documento, teléfono y correo', () => {
    const { errores } = validarCliente({
      ...VALIDO,
      nombre: 'a'.repeat(LIMITES.nombre.min - 1),
      documento: '1'.repeat(LIMITES.documento.max + 1),
      telefono: '300',
      email: 'sin-arroba',
    });

    expect(Object.keys(errores).sort()).toEqual(['documento', 'email', 'nombre', 'telefono']);
  });
});
