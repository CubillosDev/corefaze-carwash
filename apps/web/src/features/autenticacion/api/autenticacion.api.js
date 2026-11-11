import { ErrorHttp, httpCliente } from '@/lib/httpCliente';

/** Mensaje único ante credenciales incorrectas: no revela si falló el correo o la clave. */
export const MENSAJE_CREDENCIALES_INCORRECTAS = 'Usuario o contraseña incorrectos';

const MENSAJE_CUENTA_DESHABILITADA =
  'Tu cuenta está deshabilitada. Comunícate con un administrador.';

/**
 * POST /api/auth/login
 *
 * @param {{ email: string, password: string }} credenciales
 * @returns {Promise<{ usuario: { id: number, nombre: string, email: string, rol: string, activo: boolean }, token: string }>}
 * @throws {ErrorHttp} Con un mensaje apto para mostrar. Un 401 siempre se
 *   reporta con MENSAJE_CREDENCIALES_INCORRECTAS.
 */
export async function iniciarSesion({ email, password }) {
  try {
    const cuerpo = await httpCliente.crear('auth/login', { email, password });
    return { usuario: cuerpo.usuario, token: cuerpo.token };
  } catch (error) {
    if (error instanceof ErrorHttp && error.estado === 401) {
      throw new ErrorHttp(MENSAJE_CREDENCIALES_INCORRECTAS, { estado: 401, causa: error });
    }
    if (error instanceof ErrorHttp && error.estado === 403) {
      throw new ErrorHttp(MENSAJE_CUENTA_DESHABILITADA, { estado: 403, causa: error });
    }
    throw error;
  }
}
