/*
 * Validaciones de FORMATO para los formularios. Los límites vienen siempre de
 * dominio.json (vía @/constants/dominio); las reglas del negocio las valida la
 * API.
 */

/** Correo con forma usuario@dominio.ext; la API hace la validación completa. */
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mensaje de error si el texto no cumple la longitud, o undefined si la cumple.
 *
 * @param {string} texto Ya recortado.
 * @param {{ min?: number, max: number }} limites
 * @param {string} nombre "El nombre", "La descripción"...
 * @param {{ obligatorio?: boolean }} [opciones]
 */
export function errorDeLongitud(texto, { min = 0, max }, nombre, { obligatorio = true } = {}) {
  if (texto === '') {
    return obligatorio ? `${nombre} es obligatorio.` : undefined;
  }
  if (texto.length < min || texto.length > max) {
    return min > 0
      ? `${nombre} debe tener entre ${min} y ${max} caracteres.`
      : `${nombre} no puede superar los ${max} caracteres.`;
  }
  return undefined;
}

/**
 * @param {string} telefono Ya recortado.
 * @param {number} longitud LIMITES.telefono.longitud
 */
export function errorDeTelefono(telefono, longitud) {
  return /^\d+$/.test(telefono) && telefono.length === longitud
    ? undefined
    : `El teléfono debe tener ${longitud} dígitos, sin espacios.`;
}

/** @param {string} correo Ya recortado; vacío es válido (es opcional). */
export function errorDeCorreo(correo) {
  return correo === '' || PATRON_CORREO.test(correo) ? undefined : 'Escribe un correo válido.';
}

/** Quita las claves cuyo valor es undefined. */
export function soloErrores(errores) {
  return Object.fromEntries(Object.entries(errores).filter(([, valor]) => valor !== undefined));
}
