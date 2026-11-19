export const CAMPOS_OBLIGATORIOS = ['nombre', 'lavadero', 'ciudad', 'whatsapp'];

const DIGITOS_MINIMOS_WHATSAPP = 10;

/**
 * @typedef {object} SolicitudDemo
 * @property {string} nombre
 * @property {string} lavadero
 * @property {string} ciudad
 * @property {string} whatsapp
 * @property {'1'|'2-3'|'4+'} sedes
 */

/**
 * Campos que faltan o no son válidos. El WhatsApp necesita al menos diez
 * dígitos; puede llevar espacios o guiones.
 *
 * @param {SolicitudDemo} solicitud
 * @returns {string[]} Nombres de los campos inválidos (vacío si todo está bien).
 */
export function camposInvalidos(solicitud) {
  return CAMPOS_OBLIGATORIOS.filter((campo) => {
    const valor = (solicitud[campo] ?? '').trim();
    if (campo === 'whatsapp') {
      return valor.replace(/\D/g, '').length < DIGITOS_MINIMOS_WHATSAPP;
    }
    return valor === '';
  });
}

/**
 * @param {string} nombre
 * @returns {string} La primera palabra del nombre: "Carolina Restrepo" → "Carolina".
 */
export function primerNombre(nombre) {
  return nombre.trim().split(/\s+/)[0] ?? '';
}
