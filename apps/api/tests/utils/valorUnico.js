const path = require('path');

/**
 * Sello aleatorio de `longitud` dígitos en base 10, con cero a la
 * izquierda (p. ej. longitud 6 -> "003482"). Se genera UNA VEZ por
 * archivo de prueba (o una vez por cada "familia" de valores que deba
 * compartirlo, como el documento de un cliente y el de un colaborador
 * dentro del mismo archivo): un contador o sello GLOBAL compartido entre
 * archivos no funciona, porque cada archivo de prueba tiene su propio
 * registro de módulos (Jest no comparte el estado entre archivos aunque
 * corran en secuencia dentro del mismo proceso).
 *
 * @param {number} [longitud] cantidad de dígitos del sello (por defecto 6)
 * @returns {string}
 */
const generarSello = (longitud = 6) =>
  Math.floor(Math.random() * 10 ** longitud)
    .toString()
    .padStart(longitud, '0');

/**
 * Generador de valores únicos con su propio contador (arranca en 1, no
 * en 0). Cada llamada devuelve `formatear(sello, contador, ...args)`,
 * reenviando cualquier argumento extra que el propio `formatear`
 * necesite. Recibe el sello ya calculado (no lo genera él mismo) para
 * poder reusar el MISMO sello en más de un generador del mismo archivo
 * (p. ej. el documento de un cliente y el de un colaborador, que en
 * algunos archivos comparten sello y solo difieren en el contador y un
 * sufijo).
 *
 * @param {string|number} sello
 * @param {(sello: string|number, contador: number, ...args: any[]) => string|number} formatear
 * @returns {(...args: any[]) => string|number}
 */
const crearGeneradorDeValorUnico = (sello, formatear) => {
  let contador = 0;
  return (...args) => {
    contador += 1;
    return formatear(sello, contador, ...args);
  };
};

const RAIZ_API = path.resolve(__dirname, '..', '..');
const BASE_BLOQUES_SERVICIO = 1000;
const TAMANO_BLOQUE_SERVICIO = 2000;

// Un bloque fijo y disjunto de TAMANO_BLOQUE_SERVICIO números de
// `servicios.numero` (columna smallint, máx 32767) por archivo que crea
// sus propios servicios de prueba. Nunca Math.random(): los bloques no
// pueden chocar entre archivos, ni corriendo todos contra la misma BD
// local sin `db reset` de por medio (CI corre apps/api con maxWorkers=1,
// en secuencia, sin reset entre archivos — ver PR #42). El seed de
// supabase/seed.sql ocupa numero 1-16, muy por debajo del primer bloque.
// Orden fijo: un archivo nuevo se agrega al FINAL de la lista; nunca se
// reordenan ni se insertan en medio los que ya existen (correrían su
// bloque y el de todos los que vienen después).
const ARCHIVOS_CON_BLOQUE_DE_SERVICIO = [
  'tests/unit/services/servicios.service.test.js',
  'tests/integration/servicios.test.js',
  'tests/integration/credito.test.js',
  'tests/unit/services/credito.service.test.js',
  'tests/integration/jornadas.test.js',
  'tests/integration/nomina.test.js',
  'tests/unit/services/nomina.service.test.js',
  'tests/integration/ordenesLavado.test.js',
  'tests/unit/services/ordenesLavado.service.test.js',
  'tests/integration/vehiculos.test.js',
  'tests/integration/endpointsMovil.test.js',
  'tests/integration/caja.test.js',
  'tests/integration/creditoVales.test.js',
  'tests/integration/nominaReportes.test.js',
];

const archivoRelativo = (archivo) => path.relative(RAIZ_API, archivo).split(path.sep).join('/');

/**
 * Base del bloque de `servicios.numero` reservado para `archivo` (pásale
 * `__filename` del archivo de prueba que lo pide). Lanza un error claro
 * si el archivo no está en ARCHIVOS_CON_BLOQUE_DE_SERVICIO: agregarlo ahí
 * es la única forma de reservar un bloque nuevo.
 *
 * @param {string} archivo normalmente `__filename` de quien llama.
 * @returns {number}
 */
const baseBloqueServicio = (archivo) => {
  const relativo = archivoRelativo(archivo);
  const indice = ARCHIVOS_CON_BLOQUE_DE_SERVICIO.indexOf(relativo);
  if (indice === -1) {
    throw new Error(
      `"${relativo}" no tiene un bloque de numero de servicio reservado: agrégalo a ` +
        'ARCHIVOS_CON_BLOQUE_DE_SERVICIO en tests/utils/valorUnico.js.',
    );
  }
  return BASE_BLOQUES_SERVICIO + indice * TAMANO_BLOQUE_SERVICIO;
};

// Cuántos `servicios.numero` puede llegar a pedir cada archivo en UNA
// corrida (medido corriendo test:api una vez limpio contra esta rama el
// 2026-11-26, con margen de sobra). Nunca debe acercarse a
// TAMANO_BLOQUE_SERVICIO: define cuánto del bloque queda libre para el
// desplazamiento aleatorio de baseAleatoriaDeServicio. Si un archivo
// empieza a crear notablemente más servicios, sube su número aquí.
const USO_MAXIMO_DE_SERVICIO = {
  'tests/unit/services/servicios.service.test.js': 100, // medido: 18
  'tests/integration/servicios.test.js': 100, // medido: 13
  'tests/integration/credito.test.js': 50, // medido: 1
  'tests/unit/services/credito.service.test.js': 50, // medido: 1
  'tests/integration/jornadas.test.js': 50, // medido: 2
  'tests/integration/nomina.test.js': 50, // medido: 1
  'tests/unit/services/nomina.service.test.js': 50, // medido: 1
  'tests/integration/ordenesLavado.test.js': 150, // medido: 38
  'tests/unit/services/ordenesLavado.service.test.js': 150, // medido: 61
  'tests/integration/vehiculos.test.js': 50, // medido: 1
  'tests/integration/endpointsMovil.test.js': 50, // medido: 2
  'tests/integration/caja.test.js': 50, // medido: 1
  'tests/integration/creditoVales.test.js': 50, // medido: 1
  'tests/integration/nominaReportes.test.js': 50, // medido: 1
};

/**
 * Base de `servicios.numero` para `archivo` (pásale `__filename`): la
 * base fija de su bloque (baseBloqueServicio) más un desplazamiento
 * ALEATORIO acotado para no salirse de él. El bloque sigue siendo
 * disjunto de los demás archivos — eso es lo que garantiza que nunca
 * choquen entre sí, ni corriendo todos en secuencia sin reset de por
 * medio (la causa del PR #42) — y el desplazamiento aleatorio hace que
 * correr ESTE MISMO archivo dos veces sin `db reset` entre medio casi
 * nunca vuelva a pedir los números que ya dejó la corrida anterior (el
 * mismo comportamiento de antes, solo que ahora sin poder escaparse del
 * bloque y chocar con otro archivo).
 *
 * @param {string} archivo normalmente `__filename` de quien llama.
 * @returns {number}
 */
const baseAleatoriaDeServicio = (archivo) => {
  const base = baseBloqueServicio(archivo); // valida que el archivo esté registrado
  const usoMaximo = USO_MAXIMO_DE_SERVICIO[archivoRelativo(archivo)];
  if (usoMaximo === undefined) {
    throw new Error(
      `"${archivoRelativo(archivo)}" no tiene un uso máximo registrado: agrégalo a ` +
        'USO_MAXIMO_DE_SERVICIO en tests/utils/valorUnico.js.',
    );
  }
  const margen = TAMANO_BLOQUE_SERVICIO - usoMaximo;
  return base + Math.floor(Math.random() * margen);
};

module.exports = {
  generarSello,
  crearGeneradorDeValorUnico,
  baseBloqueServicio,
  baseAleatoriaDeServicio,
  ARCHIVOS_CON_BLOQUE_DE_SERVICIO,
  USO_MAXIMO_DE_SERVICIO,
  TAMANO_BLOQUE_SERVICIO,
};
