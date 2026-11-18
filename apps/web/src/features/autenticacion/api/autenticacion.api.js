import { ErrorHttp, httpCliente } from '@/lib/httpCliente';

/** Respaldo ante credenciales incorrectas si la API no envía su mensaje. */
export const MENSAJE_CREDENCIALES_INCORRECTAS = 'Usuario o contraseña incorrectos';

const MENSAJE_CUENTA_DESHABILITADA =
  'Tu cuenta está deshabilitada. Comunícate con un administrador.';

/**
 * Los 401 y 403 de la API Key hablan de la configuración del panel, no de la
 * persona: nunca se muestran tal cual.
 */
const ES_MENSAJE_DE_LA_LLAVE = /api key/i;

const RESPALDO_POR_ESTADO = Object.freeze({
  401: MENSAJE_CREDENCIALES_INCORRECTAS,
  403: MENSAJE_CUENTA_DESHABILITADA,
});

/**
 * POST /api/auth/login
 *
 * Ante 401 ("Credenciales inválidas") y 403 ("Usuario deshabilitado") muestra
 * el mensaje real del servidor; si el problema es la llave de la aplicación,
 * deja el mensaje genérico de lib/httpCliente.js.
 *
 * @param {{ email: string, password: string }} credenciales
 * @returns {Promise<{ usuario: { id: number, nombre: string, email: string, rol: string, activo: boolean }, token: string }>}
 * @throws {ErrorHttp} Con un mensaje apto para mostrar.
 */
export async function iniciarSesion({ email, password }) {
  try {
    const cuerpo = await httpCliente.crear('auth/login', { email, password });
    return { usuario: cuerpo.usuario, token: cuerpo.token };
  } catch (error) {
    const respaldo = error instanceof ErrorHttp ? RESPALDO_POR_ESTADO[error.estado] : undefined;
    if (!respaldo || ES_MENSAJE_DE_LA_LLAVE.test(error.mensajeDelServidor)) {
      throw error;
    }
    throw new ErrorHttp(error.mensajeDelServidor || respaldo, { estado: error.estado, causa: error });
  }
}
