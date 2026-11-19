/**
 * Pone en mayúscula la primera letra: mayusculaInicial('ayer') -> "Ayer".
 *
 * @param {string} texto
 * @returns {string}
 */
export function mayusculaInicial(texto) {
  const valor = String(texto ?? '');
  return valor.charAt(0).toLocaleUpperCase('es-CO') + valor.slice(1);
}
