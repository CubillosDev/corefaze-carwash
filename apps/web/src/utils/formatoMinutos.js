/**
 * Duración en minutos, como la muestra el diseño:
 *
 *   formatoMinutos(42) -> "42 min"
 *   formatoMinutos(65) -> "1h 5m"
 *
 * @param {number} minutos
 * @returns {string}
 */
export function formatoMinutos(minutos) {
  const entero = Math.max(0, Math.floor(Number(minutos) || 0));
  return entero < 60 ? `${entero} min` : `${Math.floor(entero / 60)}h ${entero % 60}m`;
}

/**
 * Minutos completos entre una fecha y hora ISO y un instante.
 *
 * @param {string} desde Fecha y hora ISO.
 * @param {number} ahora Milisegundos (Date.now()).
 * @returns {number}
 */
export function minutosDesde(desde, ahora) {
  const inicio = Date.parse(desde);
  return Number.isNaN(inicio) ? 0 : Math.max(0, Math.floor((ahora - inicio) / 60000));
}
