/**
 * Ayudas de la caja para cobrar en efectivo. Son solo una vista previa para
 * quien cobra: el total es el que fijó el servidor y el cambio definitivo lo
 * calcula el servidor al registrar el cobro.
 */

/**
 * Cambio a devolver; negativo si falta dinero y null si aún no hay monto.
 *
 * @param {number|null} recibido
 * @param {number} total
 * @returns {number|null}
 */
export function calcularCambio(recibido, total) {
  return recibido === null || recibido === undefined ? null : recibido - total;
}

/**
 * Montos con que suele pagar el cliente, como en el diseño: el exacto y los
 * redondeos hacia arriba a 10.000, 50.000, 100.000 y 200.000, sin repetir.
 *
 * @param {number} total
 * @returns {number[]} Hasta 4 montos, de menor a mayor.
 */
export function montosRapidos(total) {
  const redondear = (paso) => Math.ceil(total / paso) * paso;
  const candidatos = [total, redondear(10000), redondear(50000), redondear(100000), 200000];
  return [...new Set(candidatos.filter((monto) => monto >= total))].slice(0, 4);
}

/**
 * Convierte lo escrito en un campo de dinero a entero de pesos.
 *
 * @param {string} texto Puede traer $, puntos y espacios.
 * @returns {number|null} null si no hay ningún dígito.
 */
export function leerMonto(texto) {
  const digitos = String(texto ?? '').replace(/\D/g, '');
  return digitos === '' ? null : Number(digitos);
}
