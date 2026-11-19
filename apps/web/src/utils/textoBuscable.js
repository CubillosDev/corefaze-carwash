/**
 * Texto listo para comparar en una búsqueda: minúsculas y sin tildes, para
 * que "cierre" encuentre "Cierre" y "credito" encuentre "crédito".
 *
 * @param {string|null|undefined} texto
 * @returns {string}
 */
export function textoBuscable(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('es-CO')
    .trim();
}
