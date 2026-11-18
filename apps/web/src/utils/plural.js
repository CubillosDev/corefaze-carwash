/**
 * Cantidad con su palabra en singular o plural: plural(1, 'vehículo',
 * 'vehículos') -> "1 vehículo".
 *
 * @param {number} cantidad
 * @param {string} singular
 * @param {string} enPlural
 * @returns {string}
 */
export function plural(cantidad, singular, enPlural) {
  return `${cantidad} ${cantidad === 1 ? singular : enPlural}`;
}
