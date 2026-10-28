const ENTORNOS = Object.freeze(['development', 'test', 'production']);
const ENTORNO_POR_DEFECTO = 'development';
const PUERTO_POR_DEFECTO = '3000';
const PUERTO_MINIMO = 1;
const PUERTO_MAXIMO = 65535;
const LONGITUD_MINIMA_API_KEY = 32;
const PREFIJO_API_KEY_DE_EJEMPLO = 'REEMPLAZAR_CON';
// Más corta que una API Key (32): una API Key es un secreto generado por
// máquina que nadie necesita recordar; SUPERADMIN_PASSWORD la escribe y
// recuerda una persona, así que 32 sería un umbral poco realista. 12 ya
// descarta las contraseñas triviales más comunes sin exigir lo mismo que
// un secreto de máquina.
const LONGITUD_MINIMA_PASSWORD_SUPERADMIN = 12;
const JWT_EXPIRES_IN_POR_DEFECTO = '1h';

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

/**
 * Valida un valor ya presente contra las dos reglas que comparten las API
 * Keys y SUPERADMIN_PASSWORD: longitud mínima y "no es el valor de
 * ejemplo de .env.example". La presencia (obligatoria o no) la decide
 * quien llama, antes de invocar esto.
 */
const validarValorSeguro = (nombreVariable, valor, longitudMinima, errores) => {
  if (valor.length < longitudMinima) {
    errores.push(`${nombreVariable} debe tener al menos ${longitudMinima} caracteres`);
  } else if (valor.startsWith(PREFIJO_API_KEY_DE_EJEMPLO)) {
    errores.push(
      `${nombreVariable} conserva el valor de ejemplo de .env.example; genera uno propio`,
    );
  }
};

const validarClaveApi = (nombreVariable, variables, errores) => {
  const clave = variables[nombreVariable];

  if (!clave) {
    errores.push(`${nombreVariable} es obligatoria`);
  } else {
    validarValorSeguro(nombreVariable, clave, LONGITUD_MINIMA_API_KEY, errores);
  }

  return clave;
};

/**
 * Lee y valida las variables SUPERADMIN_* (bootstrap opcional del primer
 * superadmin del sistema, ver server.js).
 *
 * Son opcionales EN CONJUNTO: si ninguna de las tres está definida, no hay
 * bootstrap — comportamiento válido, no es un error. Pero si se define
 * cualquiera de las tres, el arranque exige que email y password sean
 * válidos (ni vacíos, ni el valor de ejemplo de .env.example, ni una
 * password demasiado corta), igual que una API Key mal puesta: nunca debe
 * poder crearse silenciosamente una cuenta con privilegios usando una
 * credencial insegura o de ejemplo.
 *
 * @param {Record<string, string|undefined>} variables
 * @param {string[]} errores
 * @returns {{ nombre: string, email: string, password: string } | null} null si el bootstrap está deshabilitado
 */
const leerSuperadmin = (variables, errores) => {
  const { SUPERADMIN_NOMBRE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = variables;

  if (!SUPERADMIN_NOMBRE && !SUPERADMIN_EMAIL && !SUPERADMIN_PASSWORD) {
    return null;
  }

  if (!SUPERADMIN_EMAIL) {
    errores.push('SUPERADMIN_EMAIL es obligatoria si se define alguna variable SUPERADMIN_*');
  } else {
    validarValorSeguro('SUPERADMIN_EMAIL', SUPERADMIN_EMAIL, 1, errores);
  }

  if (!SUPERADMIN_PASSWORD) {
    errores.push('SUPERADMIN_PASSWORD es obligatoria si se define alguna variable SUPERADMIN_*');
  } else {
    validarValorSeguro(
      'SUPERADMIN_PASSWORD',
      SUPERADMIN_PASSWORD,
      LONGITUD_MINIMA_PASSWORD_SUPERADMIN,
      errores,
    );
  }

  return {
    nombre: SUPERADMIN_NOMBRE || 'Super Administrador',
    email: SUPERADMIN_EMAIL,
    password: SUPERADMIN_PASSWORD,
  };
};

const leerJwtExpiresIn = (variables) => variables.JWT_EXPIRES_IN || JWT_EXPIRES_IN_POR_DEFECTO;

/**
 * SUPABASE_URL no es secreta (es la URL pública del proyecto, o la del
 * stack local de `npx supabase start`); SUPABASE_SERVICE_ROLE_KEY sí lo
 * es (bypasea RLS por completo), por eso reutiliza validarClaveApi, igual
 * que las API Keys y JWT_SECRET.
 */
const esUrlHttp = (texto) => {
  try {
    return ['http:', 'https:'].includes(new URL(texto).protocol);
  } catch {
    return false;
  }
};

const leerUrlSupabase = (variables, errores) => {
  const url = variables.SUPABASE_URL;

  if (!url) {
    errores.push('SUPABASE_URL es obligatoria');
    return url;
  }

  if (!esUrlHttp(url)) {
    errores.push(`SUPABASE_URL debe ser una URL http(s) válida (recibido: "${url}")`);
    return url;
  }

  return new URL(url).origin;
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
    apiKeys: {
      postman: validarClaveApi('API_KEY_POSTMAN', variables, errores),
      admin: validarClaveApi('API_KEY_ADMIN', variables, errores),
      movil: validarClaveApi('API_KEY_MOVIL', variables, errores),
      web: validarClaveApi('API_KEY_WEB', variables, errores),
    },
    jwt: {
      // Reutilizamos validarClaveApi: un secreto JWT tiene las mismas
      // reglas que una API Key (obligatorio, mínimo 32 caracteres, no
      // puede ser el valor de ejemplo).
      secret: validarClaveApi('JWT_SECRET', variables, errores),
      expiresIn: leerJwtExpiresIn(variables),
    },
    origenPermitido: leerOrigenPermitido(variables, errores),
    superadmin: leerSuperadmin(variables, errores),
    supabase: {
      url: leerUrlSupabase(variables, errores),
      serviceRoleKey: validarClaveApi('SUPABASE_SERVICE_ROLE_KEY', variables, errores),
    },
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
