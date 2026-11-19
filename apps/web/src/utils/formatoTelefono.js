/**
 * Teléfono colombiano de 10 dígitos agrupado como en el diseño:
 * formatoTelefono('3001234567') -> "300 123 4567". Otro largo se muestra tal cual.
 *
 * @param {string|null|undefined} telefono
 * @returns {string}
 */
export function formatoTelefono(telefono) {
  const texto = String(telefono ?? '').trim();
  return /^[0-9]{10}$/.test(texto) ? `${texto.slice(0, 3)} ${texto.slice(3, 6)} ${texto.slice(6)}` : texto;
}
