/**
 * Trazabilidad en memoria: acumula cuánto tarda cada endpoint de la API.
 * Guarda solo el patrón de la ruta (`GET /api/clientes/:id`), nunca la URL
 * real ni datos de la petición, para no registrar identificadores ni datos
 * personales. Las métricas viven en la memoria del proceso y se pierden al
 * reiniciar; no reemplazan un sistema de observabilidad.
 */

/** Muestras recientes que se guardan por ruta para la mediana y el p95. */
const MUESTRAS_POR_RUTA = 200;

/** Rutas distintas que se registran; las demás se agrupan en RUTA_OTRAS. */
const MAXIMO_DE_RUTAS = 100;
const RUTA_OTRAS = 'otras rutas';

const redondear = (valor) => Math.round(valor * 100) / 100;

/**
 * Percentil por el método del rango más cercano.
 *
 * @param {number[]} valores
 * @param {number} percentil entre 0 y 100
 */
const percentil = (valores, percentil) => {
  if (valores.length === 0) {
    return 0;
  }
  const ordenados = [...valores].sort((a, b) => a - b);
  const posicion = Math.max(0, Math.ceil((percentil / 100) * ordenados.length) - 1);
  return ordenados[posicion];
};

const crearRegistroTrazabilidad = ({ maximoDeRutas = MAXIMO_DE_RUTAS } = {}) => {
  let rutas = new Map();
  let desde = new Date().toISOString();

  const entradaDe = (ruta) => {
    const nombre = rutas.has(ruta) || rutas.size < maximoDeRutas ? ruta : RUTA_OTRAS;
    if (!rutas.has(nombre)) {
      rutas.set(nombre, { peticiones: 0, totalMs: 0, minimoMs: Infinity, maximoMs: 0, errores4xx: 0, errores5xx: 0, muestras: [] });
    }
    return rutas.get(nombre);
  };

  /**
   * @param {{ ruta: string, estado: number, milisegundos: number }} medicion
   */
  const registrar = ({ ruta, estado, milisegundos }) => {
    const entrada = entradaDe(ruta);
    entrada.peticiones += 1;
    entrada.totalMs += milisegundos;
    entrada.minimoMs = Math.min(entrada.minimoMs, milisegundos);
    entrada.maximoMs = Math.max(entrada.maximoMs, milisegundos);
    if (estado >= 500) {
      entrada.errores5xx += 1;
    } else if (estado >= 400) {
      entrada.errores4xx += 1;
    }
    entrada.muestras.push(milisegundos);
    if (entrada.muestras.length > MUESTRAS_POR_RUTA) {
      entrada.muestras.shift();
    }
  };

  /** Métricas por ruta, de la más lenta (promedio) a la más rápida. */
  const resumen = () => {
    const filas = [...rutas.entries()].map(([ruta, e]) => ({
      ruta,
      peticiones: e.peticiones,
      promedioMs: redondear(e.totalMs / e.peticiones),
      medianaMs: redondear(percentil(e.muestras, 50)),
      p95Ms: redondear(percentil(e.muestras, 95)),
      minimoMs: redondear(e.minimoMs),
      maximoMs: redondear(e.maximoMs),
      errores4xx: e.errores4xx,
      errores5xx: e.errores5xx,
    }));
    filas.sort((a, b) => b.promedioMs - a.promedioMs);
    return {
      desde,
      totalPeticiones: filas.reduce((suma, fila) => suma + fila.peticiones, 0),
      rutas: filas,
    };
  };

  const reiniciar = () => {
    rutas = new Map();
    desde = new Date().toISOString();
  };

  return { registrar, resumen, reiniciar };
};

/** Registro único del proceso, compartido por el middleware y las rutas. */
const registroTrazabilidad = crearRegistroTrazabilidad();

module.exports = { crearRegistroTrazabilidad, registroTrazabilidad, percentil, RUTA_OTRAS };
