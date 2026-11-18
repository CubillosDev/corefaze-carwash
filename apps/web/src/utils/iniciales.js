/**
 * Iniciales de un nombre para los avatares: "Laura Jiménez" -> "LJ". Con una
 * sola palabra devuelve su inicial; sin texto, cadena vacía.
 *
 * @param {string|null|undefined} nombre
 * @returns {string}
 */
export function iniciales(nombre) {
  return String(nombre ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0].toLocaleUpperCase('es-CO'))
    .join('');
}
