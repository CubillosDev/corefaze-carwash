const FORMATO = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export const DESCUENTO_ANUAL = 0.15;

/**
 * Precio mensual del plan según la facturación, redondeado a miles: "$149.000".
 *
 * @param {number} mensual Precio mensual en pesos.
 * @param {boolean} anual Con facturación anual se aplica el descuento.
 * @returns {string}
 */
export function formatoPrecio(mensual, anual) {
  const valor = anual ? mensual * (1 - DESCUENTO_ANUAL) : mensual;
  return `$${FORMATO.format(Math.round(valor / 1000) * 1000)}`;
}
