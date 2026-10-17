import { normalizarEspacios } from '@/utils/normalizarEspacios';

const FORMATEADOR_PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Formatea un valor en pesos colombianos para mostrarlo en pantalla.
 *
 *   formatoMoneda(28000) -> "$ 28.000"
 *
 * El dinero viaja como entero de pesos por toda la aplicación (API, estado,
 * formularios); este es el único lugar donde se convierte a texto. Nunca se
 * muestran decimales y un valor que no sea un número usable se muestra "$ 0".
 *
 * @param {number|string|null|undefined} valor Pesos como entero.
 * @returns {string}
 */
export function formatoMoneda(valor) {
  const numero = typeof valor === 'string' ? Number(valor.trim()) : Number(valor);
  const pesos = Number.isFinite(numero) ? Math.round(numero) : 0;

  // Math.round(-0.4) devuelve -0 y se formatearía como "-$ 0".
  return normalizarEspacios(FORMATEADOR_PESOS.format(pesos === 0 ? 0 : pesos));
}
