const FORMATEADOR = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/**
 * Formatea una fracción como porcentaje: formatoPorcentaje(0.4) -> "40 %".
 * Un valor que no sea número se muestra "0 %".
 *
 * @param {number|string|null|undefined} fraccion Entre 0 y 1.
 * @returns {string}
 */
export function formatoPorcentaje(fraccion) {
  const numero = Number(fraccion);
  const porcentaje = Number.isFinite(numero) ? Math.round(numero * 10000) / 100 : 0;
  return `${FORMATEADOR.format(porcentaje)} %`;
}
