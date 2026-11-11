/**
 * Cliente HTTP único del panel web: el único lugar de la aplicación que usa
 * fetch. Concentra la URL base, la llave de la API, el tiempo máximo de espera
 * y la traducción de errores al español.
 *
 * Contrato de la API (apps/api):
 * - Todo /api/* exige el encabezado X-API-Key, salvo /api/salud.
 * - Cuando hay sesión, se agrega Authorization: Bearer <token>. El token no se
 *   guarda aquí: lo entrega la sesión (ver `vincularSesion`).
 * - Un 401 en una solicitud que llevaba token significa sesión vencida o
 *   inválida: se avisa a la sesión para que se cierre.
 * - Los errores llegan como { mensaje } y, en 400, como
 *   { mensaje, errores: [{ campo, mensaje }] }.
 *
 * Las funciones de cada recurso viven en src/features/<recurso>/api/ y se
 * apoyan en `httpCliente`.
 */

const TIEMPO_MAXIMO_POR_DEFECTO_MS = 15_000;

const MENSAJE_SIN_CONEXION =
  'No pudimos comunicarnos con el servidor. Revisa tu conexión e inténtalo de nuevo.';

const MENSAJE_TIEMPO_AGOTADO =
  'El servidor tardó demasiado en responder. Inténtalo de nuevo en unos segundos.';

const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.';

const MENSAJES_POR_ESTADO = Object.freeze({
  400: 'Hay datos que no son válidos. Revisa el formulario e inténtalo de nuevo.',
  401: 'No pudimos verificar tu acceso. Vuelve a iniciar sesión y, si sigue fallando, avisa a soporte.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No encontramos lo que buscas.',
  409: 'No se puede completar porque choca con información que ya está registrada.',
  413: 'La información enviada es demasiado grande.',
  429: 'Hiciste demasiadas solicitudes seguidas. Espera un momento e inténtalo de nuevo.',
  500: 'El servidor presentó un error. Inténtalo de nuevo en unos minutos.',
});

/**
 * Estados en los que el mensaje de la API habla del negocio ("Ya existe un
 * cliente con ese documento") y conviene mostrarlo tal cual. En el resto el
 * mensaje es técnico ("API Key inválida") y se reemplaza por el de la tabla.
 */
const ESTADOS_CON_MENSAJE_DEL_SERVIDOR = new Set([400, 404, 409]);

/** Error de una solicitud HTTP con el mensaje ya listo para mostrar. */
export class ErrorHttp extends Error {
  /**
   * @param {string} mensaje
   * @param {object} [opciones]
   * @param {number} [opciones.estado] Código HTTP; 0 si no hubo respuesta.
   * @param {Record<string, string>} [opciones.erroresPorCampo] En 400: campo -> mensaje.
   * @param {unknown} [opciones.causa]
   */
  constructor(mensaje, { estado = 0, erroresPorCampo = {}, causa } = {}) {
    super(mensaje, { cause: causa });
    this.name = 'ErrorHttp';
    this.estado = estado;
    this.erroresPorCampo = erroresPorCampo;
  }
}

function mensajeDeEstado(estado, cuerpo) {
  const mensajeDelServidor = typeof cuerpo?.mensaje === 'string' ? cuerpo.mensaje : '';

  if (mensajeDelServidor !== '' && ESTADOS_CON_MENSAJE_DEL_SERVIDOR.has(estado)) {
    return mensajeDelServidor;
  }
  return MENSAJES_POR_ESTADO[estado] ?? (estado >= 500 ? MENSAJES_POR_ESTADO[500] : MENSAJE_GENERICO);
}

function erroresPorCampoDe(cuerpo) {
  if (!Array.isArray(cuerpo?.errores)) {
    return {};
  }
  return Object.fromEntries(
    cuerpo.errores
      .filter((error) => typeof error?.campo === 'string' && typeof error?.mensaje === 'string')
      .map((error) => [error.campo, error.mensaje]),
  );
}

/**
 * Lee el cuerpo como JSON. La lectura del texto queda fuera del try a
 * propósito: si el tiempo se agota a mitad de la descarga, ese error debe
 * llegar arriba y no confundirse con una respuesta vacía.
 */
async function leerCuerpo(respuesta) {
  if (respuesta.status === 204) {
    return null;
  }

  const texto = await respuesta.text();
  if (texto === '') {
    return null;
  }

  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function construirUrl(urlBase, ruta, consulta) {
  const base = String(urlBase).replace(/\/+$/, '');
  const camino = String(ruta).replace(/^\/+/, '');
  const url = `${base}/${camino}`;

  if (!consulta) {
    return url;
  }

  const parametros = new URLSearchParams();
  for (const [clave, valor] of Object.entries(consulta)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      parametros.append(clave, String(valor));
    }
  }

  const textoConsulta = parametros.toString();
  return textoConsulta === '' ? url : `${url}?${textoConsulta}`;
}

/**
 * Crea un cliente HTTP con su propia configuración. La aplicación usa la
 * instancia `httpCliente` de abajo; la fábrica existe para probarlo con un
 * fetch simulado sin tocar variables globales.
 *
 * @param {object} configuracion
 * @param {string} configuracion.urlBase
 * @param {string} [configuracion.llaveApi] Valor del encabezado X-API-Key.
 * @param {number} [configuracion.tiempoMaximoMs]
 * @param {typeof fetch} [configuracion.hacerPeticion] Implementación de fetch.
 * @param {() => (string|null)} [configuracion.obtenerToken] Token de la sesión
 *   actual, o null si no hay sesión.
 * @param {() => void} [configuracion.alSesionExpirada] Se llama cuando la API
 *   responde 401 a una solicitud que llevaba token.
 */
export function crearHttpCliente({
  urlBase,
  llaveApi = '',
  tiempoMaximoMs = TIEMPO_MAXIMO_POR_DEFECTO_MS,
  hacerPeticion = (...argumentos) => fetch(...argumentos),
  obtenerToken = () => null,
  alSesionExpirada = () => {},
}) {
  /**
   * @param {string} ruta Camino relativo a la URL base, por ejemplo 'servicios'.
   * @param {object} [opciones] Lo que no se reconoce aquí se reenvía a fetch.
   * @param {string} [opciones.metodo]
   * @param {unknown} [opciones.datos] Cuerpo que se envía como JSON.
   * @param {Record<string, unknown>} [opciones.consulta] Parámetros de la URL.
   * @param {AbortSignal} [opciones.signal] Cancelación desde quien llama.
   * @param {number} [opciones.tiempoMaximoMs]
   * @returns {Promise<unknown>} El cuerpo de la respuesta, o null si no trae.
   * @throws {ErrorHttp} Si la API responde con error, no hay conexión o se
   *   agota el tiempo. Si quien llama cancela, se propaga su AbortError.
   */
  async function solicitar(
    ruta,
    {
      metodo = 'GET',
      datos,
      consulta,
      headers,
      signal,
      tiempoMaximoMs: tiempoDeEstaSolicitud = tiempoMaximoMs,
      ...opcionesFetch
    } = {},
  ) {
    const encabezados = { Accept: 'application/json', ...headers };
    if (llaveApi !== '') {
      encabezados['X-API-Key'] = llaveApi;
    }
    if (datos !== undefined) {
      encabezados['Content-Type'] = 'application/json';
    }
    const token = obtenerToken();
    if (token) {
      encabezados.Authorization = `Bearer ${token}`;
    }

    // Si quien llama ya canceló, no se envía nada.
    signal?.throwIfAborted();

    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), tiempoDeEstaSolicitud);
    const reenviarCancelacion = () => controlador.abort(signal.reason);
    signal?.addEventListener('abort', reenviarCancelacion, { once: true });

    try {
      const respuesta = await hacerPeticion(construirUrl(urlBase, ruta, consulta), {
        ...opcionesFetch,
        method: metodo,
        headers: encabezados,
        body: datos === undefined ? undefined : JSON.stringify(datos),
        signal: controlador.signal,
      });

      const cuerpo = await leerCuerpo(respuesta);

      if (!respuesta.ok) {
        // Sin token no hay sesión que cerrar: un 401 al iniciar sesión es solo
        // "credenciales incorrectas" y lo resuelve quien llama.
        if (respuesta.status === 401 && token) {
          alSesionExpirada();
        }
        throw new ErrorHttp(mensajeDeEstado(respuesta.status, cuerpo), {
          estado: respuesta.status,
          erroresPorCampo: erroresPorCampoDe(cuerpo),
        });
      }

      return cuerpo;
    } catch (error) {
      if (error instanceof ErrorHttp || signal?.aborted) {
        throw error;
      }
      const mensaje = controlador.signal.aborted ? MENSAJE_TIEMPO_AGOTADO : MENSAJE_SIN_CONEXION;
      throw new ErrorHttp(mensaje, { estado: 0, causa: error });
    } finally {
      clearTimeout(temporizador);
      signal?.removeEventListener('abort', reenviarCancelacion);
    }
  }

  return Object.freeze({
    obtener: (ruta, opciones) => solicitar(ruta, { ...opciones, metodo: 'GET' }),
    crear: (ruta, datos, opciones) => solicitar(ruta, { ...opciones, metodo: 'POST', datos }),
    reemplazar: (ruta, datos, opciones) => solicitar(ruta, { ...opciones, metodo: 'PUT', datos }),
    actualizar: (ruta, datos, opciones) => solicitar(ruta, { ...opciones, metodo: 'PATCH', datos }),
    eliminar: (ruta, opciones) => solicitar(ruta, { ...opciones, metodo: 'DELETE' }),
  });
}

const SIN_SESION = Object.freeze({ obtenerToken: () => null, alSesionExpirada: () => {} });
let enlaceSesion = SIN_SESION;

/**
 * Conecta la sesión con el cliente HTTP de la aplicación. Lo llama una sola vez
 * el proveedor de sesión; el token se pide en cada solicitud, así que nunca se
 * copia ni se guarda fuera de la sesión.
 *
 * @param {{ obtenerToken: () => (string|null), alSesionExpirada: () => void }} enlace
 * @returns {() => void} Desconecta la sesión.
 */
export function vincularSesion(enlace) {
  enlaceSesion = enlace;
  return () => {
    if (enlaceSesion === enlace) {
      enlaceSesion = SIN_SESION;
    }
  };
}

export const httpCliente = crearHttpCliente({
  urlBase: import.meta.env.VITE_API_URL ?? '',
  llaveApi: import.meta.env.VITE_API_KEY ?? '',
  obtenerToken: () => enlaceSesion.obtenerToken(),
  alSesionExpirada: () => enlaceSesion.alSesionExpirada(),
});
