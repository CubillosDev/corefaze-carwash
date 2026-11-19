/** Horario del lavadero que dibuja el diseño (7 a. m. a 6 p. m.). */
const HORA_INICIO = 7;
const HORA_FIN = 18;

const acumular = (porHora, horas) => {
  let suma = 0;
  return horas.map((hora) => {
    suma += porHora.get(hora) ?? 0;
    return suma;
  });
};

/**
 * Ingresos acumulados hora a hora de una jornada y de la anterior, para la
 * curva del tablero. Las horas van de 7 a 18 y se amplían si hubo ventas por
 * fuera de ese horario.
 *
 * @param {object} datos
 * @param {{ hora: number, ingresos: number }[]} datos.horas Ventas de la jornada.
 * @param {{ hora: number, ingresos: number }[]|null} datos.horasAnteriores Ventas de la jornada anterior.
 * @param {number} datos.horaActual Hasta qué hora va la jornada (23 si ya pasó el día).
 * @returns {{
 *   horas: number[],
 *   hoy: (number|null)[],
 *   anterior: number[]|null,
 *   total: number,
 *   anteriorALaHora: number|null,
 *   totalAnterior: number|null,
 * }}
 */
export function curvaAcumulada({ horas, horasAnteriores, horaActual }) {
  const conVentas = [...horas, ...(horasAnteriores ?? [])].map((fila) => fila.hora);
  const inicio = Math.min(HORA_INICIO, ...conVentas);
  const fin = Math.max(HORA_FIN, ...conVentas);
  const rango = Array.from({ length: fin - inicio + 1 }, (_, indice) => inicio + indice);

  const hoy = acumular(new Map(horas.map((fila) => [fila.hora, fila.ingresos])), rango);
  const base = {
    horas: rango,
    hoy: rango.map((hora, indice) => (hora <= horaActual ? hoy[indice] : null)),
    total: hoy.at(-1),
  };

  if (!horasAnteriores) {
    return { ...base, anterior: null, anteriorALaHora: null, totalAnterior: null };
  }

  const anterior = acumular(new Map(horasAnteriores.map((fila) => [fila.hora, fila.ingresos])), rango);
  const hastaAhora = rango.filter((hora) => hora <= horaActual).length;

  return {
    ...base,
    anterior,
    anteriorALaHora: hastaAhora ? anterior[hastaAhora - 1] : 0,
    totalAnterior: anterior.at(-1),
  };
}

/**
 * Variación porcentual (entera) de la jornada frente a lo que la anterior
 * llevaba a la misma hora. Null si no hay con qué comparar.
 *
 * @param {{ total: number, anteriorALaHora: number|null }|null} curva
 * @returns {number|null}
 */
export function variacionALaHora(curva) {
  if (!curva?.anteriorALaHora) {
    return null;
  }
  return Math.round(((curva.total - curva.anteriorALaHora) / curva.anteriorALaHora) * 100);
}

/**
 * Hora para el eje de la curva, como en el diseño: con "a. m." o "p. m."
 * solo donde se pide (la primera, la primera de la tarde y la última).
 *
 * @param {number} hora 0 a 23.
 * @param {boolean} conPeriodo
 * @returns {string}
 */
export function etiquetaDeHora(hora, conPeriodo) {
  const enDoce = hora % 12 === 0 ? 12 : hora % 12;
  return conPeriodo ? `${enDoce} ${hora < 12 ? 'a. m.' : 'p. m.'}` : String(enDoce);
}
