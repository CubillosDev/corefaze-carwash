const ENTORNOS = Object.freeze(['development', 'test', 'production']);
const ENTORNO_POR_DEFECTO = 'development';
const PUERTO_POR_DEFECTO = '3000';
const PUERTO_MINIMO = 1;
const PUERTO_MAXIMO = 65535;
const LONGITUD_MINIMA_API_KEY = 32;
const PREFIJO_API_KEY_DE_EJEMPLO = 'cambiar-por';

/**
 * Cada función leer* toma UNA variable, la valida y devuelve su valor ya
 * convertido. Si es inválida, agrega un mensaje a `errores` en lugar de lanzar,
 * para poder reportar todos los problemas juntos.
 */

const leerEntorno = (variables, errores) => {
  const entorno = variables.NODE_ENV || ENTORNO_POR_DEFECTO;

  if (!ENTORNOS.includes(entorno)) {
    errores.push(`NODE_ENV debe ser uno de: ${ENTORNOS.join(', ')} (recibido: "${entorno}")`);
  }

  return entorno;
};

const leerPuerto = (variables, errores) => {
  const texto = variables.PORT || PUERTO_POR_DEFECTO;
  // Solo dígitos: rechaza "abc", "30.5" y "3e3", que Number() aceptaría o convertiría mal
  const puerto = /^\d+$/.test(texto) ? Number(texto) : NaN;

  if (!Number.isInteger(puerto) || puerto < PUERTO_MINIMO || puerto > PUERTO_MAXIMO) {
    errores.push(
      `PORT debe ser un entero entre ${PUERTO_MINIMO} y ${PUERTO_MAXIMO} (recibido: "${texto}")`,
    );
  }

  return puerto;
};

const leerApiKey = (variables, errores) => {
  const apiKey = variables.API_KEY;

  // Por seguridad, ningún mensaje de error incluye el valor de la llave
  if (!apiKey) {
    errores.push('API_KEY es obligatoria');
  } else if (apiKey.length < LONGITUD_MINIMA_API_KEY) {
    errores.push(`API_KEY debe tener al menos ${LONGITUD_MINIMA_API_KEY} caracteres`);
  } else if (apiKey.startsWith(PREFIJO_API_KEY_DE_EJEMPLO)) {
    errores.push('API_KEY conserva el valor de ejemplo de .env.example; genera una propia');
  }

  return apiKey;
};

const esUrlHttp = (texto) => {
  try {
    return ['http:', 'https:'].includes(new URL(texto).protocol);
  } catch {
    return false;
  }
};

const leerOrigenPermitido = (variables, errores) => {
  const origen = variables.ALLOWED_ORIGIN;

  if (!origen) {
    errores.push('ALLOWED_ORIGIN es obligatoria');
    return origen;
  }

  if (!esUrlHttp(origen)) {
    errores.push(
      `ALLOWED_ORIGIN debe ser una URL http(s) válida, ej. http://localhost:5173 (recibido: "${origen}")`,
    );
    return origen;
  }

  // .origin quita la barra final y cualquier ruta: CORS compara el origen exacto
  return new URL(origen).origin;
};

/**
 * Lee y valida las variables de entorno.
 * Recibe `variables` como parámetro (por defecto process.env) para poder
 * probarla con datos inventados sin tocar el entorno real.
 *
 * @param {Record<string, string | undefined>} variables
 * @returns {Readonly<{entorno: string, puerto: number, apiKey: string, origenPermitido: string}>}
 * @throws {Error} con la lista completa de variables inválidas
 */
const cargarConfiguracion = (variables = process.env) => {
  const errores = [];

  const configuracion = {
    entorno: leerEntorno(variables, errores),
    puerto: leerPuerto(variables, errores),
    apiKey: leerApiKey(variables, errores),
    origenPermitido: leerOrigenPermitido(variables, errores),
  };

  if (errores.length > 0) {
    const detalle = errores.map((error) => `  - ${error}`).join('\n');
    throw new Error(`Configuración inválida, corrige el archivo .env:\n${detalle}`);
  }

  return Object.freeze(configuracion);
};

// Se ejecuta una sola vez al importar el módulo: si falla, la API no arranca
const env = cargarConfiguracion();

module.exports = { env, cargarConfiguracion };
