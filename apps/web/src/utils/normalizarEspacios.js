/**
 * Reemplaza los espacios duros que produce Intl (U+00A0 y U+202F) por un
 * espacio normal.
 *
 * Sin esto, `Intl.NumberFormat('es-CO')` devuelve "$\u00A028.000" y el
 * indicador de hora llega como "p.\u00A0m.": se ven igual en pantalla pero
 * rompen las comparaciones en las pruebas y ensucian el texto al copiarlo.
 *
 * @param {unknown} texto
 * @returns {string}
 */
export function normalizarEspacios(texto) {
  return String(texto).replace(/[\u00a0\u202f]/g, ' ');
}
