/**
 * Cliente HTTP único del panel web.
 *
 * Ningún componente llama a fetch directamente: todo pasa por aquí para que la
 * URL base, la llave de la API y la traducción de errores al español vivan en
 * un solo lugar.
 *
 * Esqueleto de la Fundación técnica: las funciones por recurso viven en
 * src/features/<recurso>/api/ y se apoyan en este cliente.
 */

const URL_BASE = import.meta.env.VITE_API_URL ?? '';
const LLAVE_API = import.meta.env.VITE_API_KEY ?? '';

const MENSAJE_SIN_CONEXION =
  'No pudimos comunicarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.';

const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.';

/** Traducción de los códigos que devuelve la API a mensajes para la persona. */
const MENSAJES_POR_ESTADO = Object.freeze({
  400: 'Los datos enviados no son válidos. Revisa el formulario e inténtalo de nuevo.',
  401: 'Tu sesión no es válida o ya expiró. Vuelve a iniciar sesión.',
  403: 'Tu rol no tiene permiso para realizar esta acción.',
  404: 'No encontramos el recurso solicitado.',
  409: 'El registro entra en conflicto con información que ya existe.',
  500: 'El servidor presentó un error. Inténtalo de nuevo más tarde.',
});

/** Error de una solicitud HTTP, con el mensaje ya listo para mostrar. */
export class ErrorHttp extends Error {
  constructor(mensaje, { estado = 0, detalles = null, causa = undefined } = {}) {
    super(mensaje, { cause: causa });
    this.name = 'ErrorHttp';
    this.estado = estado;
    this.detalles = detalles;
  }
}

function construirUrl(ruta) {
  const base = URL_BASE.replace(/\/+$/, '');
  const camino = String(ruta).replace(/^\/+/, '');
  return `${base}/${camino}`;
}

/**
 * La API responde sus errores con { mensaje }. Si viene, ese texto gana:
 * es más específico que la tabla de códigos.
 */
function mensajeDeError(estado, cuerpo) {
  if (cuerpo !== null && typeof cuerpo === 'object' && typeof cuerpo.mensaje === 'string') {
    return cuerpo.mensaje;
  }
  return MENSAJES_POR_ESTADO[estado] ?? MENSAJE_GENERICO;
}

async function leerCuerpo(respuesta) {
  if (respuesta.status === 204) {
    return null;
  }

  const tipoDeContenido = respuesta.headers.get('content-type') ?? '';
  if (!tipoDeContenido.includes('application/json')) {
    return null;
  }

  try {
    return await respuesta.json();
  } catch {
    return null;
  }
}

/**
 * @param {string} ruta Camino relativo a VITE_API_URL, por ejemplo 'clientes'.
 * @param {object} [opciones] Se reenvían a fetch (signal, cache, ...).
 * @param {string} [opciones.metodo]
 * @param {unknown} [opciones.datos] Cuerpo que se serializa como JSON.
 * @returns {Promise<unknown>} El cuerpo ya convertido, o null si no hubo.
 * @throws {ErrorHttp}
 */
async function solicitar(ruta, { metodo = 'GET', datos, headers, ...opcionesFetch } = {}) {
  const encabezados = { Accept: 'application/json', ...headers };

  if (LLAVE_API !== '') {
    encabezados['X-API-Key'] = LLAVE_API;
  }
  if (datos !== undefined) {
    encabezados['Content-Type'] = 'application/json';
  }

  let respuesta;
  try {
    respuesta = await fetch(construirUrl(ruta), {
      ...opcionesFetch,
      method: metodo,
      headers: encabezados,
      body: datos === undefined ? undefined : JSON.stringify(datos),
    });
  } catch (causa) {
    throw new ErrorHttp(MENSAJE_SIN_CONEXION, { estado: 0, causa });
  }

  const cuerpo = await leerCuerpo(respuesta);

  if (!respuesta.ok) {
    throw new ErrorHttp(mensajeDeError(respuesta.status, cuerpo), {
      estado: respuesta.status,
      detalles: cuerpo,
    });
  }

  return cuerpo;
}

export const httpCliente = Object.freeze({
  obtener: (ruta, opciones) => solicitar(ruta, { ...opciones, metodo: 'GET' }),
  crear: (ruta, datos, opciones) => solicitar(ruta, { ...opciones, metodo: 'POST', datos }),
  reemplazar: (ruta, datos, opciones) => solicitar(ruta, { ...opciones, metodo: 'PUT', datos }),
  actualizar: (ruta, datos, opciones) => solicitar(ruta, { ...opciones, metodo: 'PATCH', datos }),
  eliminar: (ruta, opciones) => solicitar(ruta, { ...opciones, metodo: 'DELETE' }),
});
