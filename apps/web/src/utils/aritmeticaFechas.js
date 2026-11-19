/**
 * Aritmética de fechas sin hora (YYYY-MM-DD). Se hace en UTC a medianoche
 * para que la zona horaria del equipo nunca corra un día.
 */

const aUtc = (fecha) => new Date(`${fecha}T00:00:00Z`);
const deUtc = (fecha) => fecha.toISOString().slice(0, 10);

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/**
 * @param {string} fecha YYYY-MM-DD
 * @param {number} dias Puede ser negativo.
 * @returns {string}
 */
export function sumarDias(fecha, dias) {
  const resultado = aUtc(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return deUtc(resultado);
}

/**
 * @param {string} fecha YYYY-MM-DD
 * @returns {string} El día 1 del mismo mes.
 */
export function primerDiaDelMes(fecha) {
  return `${fecha.slice(0, 8)}01`;
}

/**
 * @param {string} fecha YYYY-MM-DD
 * @returns {string} "lun", "mar"…
 */
export function diaCortoDeLaSemana(fecha) {
  return DIAS_CORTOS[aUtc(fecha).getUTCDay()];
}
