import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  iniciarSesion,
  MENSAJE_CREDENCIALES_INCORRECTAS,
} from '@/features/autenticacion/api/autenticacion.api';
import { ErrorHttp, httpCliente } from '@/lib/httpCliente';

// httpCliente está congelado (Object.freeze), así que no se puede espiar:
// se reemplaza solo la instancia y se conserva ErrorHttp real.
vi.mock('@/lib/httpCliente', async (importarOriginal) => ({
  ...(await importarOriginal()),
  httpCliente: { crear: vi.fn() },
}));

beforeEach(() => {
  httpCliente.crear.mockReset();
});

describe('iniciarSesion', () => {
  it('envía el correo y la contraseña a auth/login y devuelve usuario y token', async () => {
    const usuario = { id: 1, nombre: 'Ana', email: 'ana@prueba.com', rol: 'soporte', activo: true };
    const crear = httpCliente.crear.mockResolvedValue({
      mensaje: 'Autenticación correcta',
      usuario,
      token: 'jwt',
    });

    const resultado = await iniciarSesion({ email: 'ana@prueba.com', password: 'clave' });

    expect(crear).toHaveBeenCalledWith('auth/login', { email: 'ana@prueba.com', password: 'clave' });
    expect(resultado).toEqual({ usuario, token: 'jwt' });
  });

  it.each([
    [401, 'Credenciales inválidas'],
    [403, 'Usuario deshabilitado'],
  ])('en %i muestra el mensaje real del servidor', async (estado, mensajeDelServidor) => {
    httpCliente.crear.mockRejectedValue(
      new ErrorHttp('Mensaje genérico', { estado, mensajeDelServidor }),
    );

    await expect(iniciarSesion({ email: 'a@b.co', password: 'x' })).rejects.toMatchObject({
      message: mensajeDelServidor,
      estado,
    });
  });

  it('usa un respaldo si la API no envía mensaje', async () => {
    httpCliente.crear.mockRejectedValueOnce(new ErrorHttp('x', { estado: 401 }));
    httpCliente.crear.mockRejectedValueOnce(new ErrorHttp('x', { estado: 403 }));

    await expect(iniciarSesion({ email: 'a@b.co', password: 'x' })).rejects.toMatchObject({
      message: MENSAJE_CREDENCIALES_INCORRECTAS,
    });
    await expect(iniciarSesion({ email: 'a@b.co', password: 'x' })).rejects.toMatchObject({
      message: expect.stringMatching(/deshabilitada/i),
    });
  });

  it('no muestra los mensajes técnicos de la API Key', async () => {
    const error = new ErrorHttp('No pudimos verificar tu acceso.', {
      estado: 401,
      mensajeDelServidor: 'API Key inválida',
    });
    httpCliente.crear.mockRejectedValue(error);

    await expect(iniciarSesion({ email: 'a@b.co', password: 'x' })).rejects.toBe(error);
  });

  it('deja pasar los demás errores con su mensaje (429, sin conexión...)', async () => {
    const error = new ErrorHttp('Hiciste demasiadas solicitudes seguidas.', { estado: 429 });
    httpCliente.crear.mockRejectedValue(error);

    await expect(iniciarSesion({ email: 'a@b.co', password: 'x' })).rejects.toBe(error);
  });
});
