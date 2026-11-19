/**
 * Fechas de negocio (YYYY-MM-DD, sin hora) en la zona del lavadero.
 *
 * La aritmética se hace en UTC sobre la fecha a medianoche: así sumar días
 * nunca se corre por la zona horaria del servidor.
 */

const ZONA_NEGOCIO = 'America/Bogota';

/** Hoy en Bogotá, como YYYY-MM-DD ('en-CA' da ese formato directamente). */
const fechaDeHoyEnBogota = (ahora = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_NEGOCIO }).format(ahora);

const aUtc = (fecha) => new Date(`${fecha}T00:00:00Z`);
const deUtc = (fecha) => fecha.toISOString().slice(0, 10);

/**
 * @param {string} fecha YYYY-MM-DD
 * @param {number} dias Puede ser negativo.
 * @returns {string} YYYY-MM-DD
 */
const sumarDias = (fecha, dias) => {
  const resultado = aUtc(fecha);
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return deUtc(resultado);
};

/** Días entre dos fechas, contando ambas (2026-11-01 a 2026-11-01 = 1). */
const diasDelRango = (desde, hasta) => Math.round((aUtc(hasta) - aUtc(desde)) / 86400000) + 1;

/** Todas las fechas del rango, en orden. */
const fechasDelRango = (desde, hasta) =>
  Array.from({ length: Math.max(0, diasDelRango(desde, hasta)) }, (_, indice) =>
    sumarDias(desde, indice),
  );

module.exports = { ZONA_NEGOCIO, fechaDeHoyEnBogota, sumarDias, diasDelRango, fechasDelRango };
