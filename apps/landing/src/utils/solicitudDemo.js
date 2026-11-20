export const CAMPOS_OBLIGATORIOS = ['nombre', 'lavadero', 'ciudad', 'whatsapp'];

const DIGITOS_MINIMOS_WHATSAPP = 10;
const SEDES = { 1: '1 sede', '2-3': '2 a 3 sedes', '4+': '4 o más sedes' };

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
 * Enlace mailto: con la solicitud armada, para que la persona la envíe desde
 * su propio correo.
 *
 * @param {string} correo Dirección de contacto del negocio.
 * @param {SolicitudDemo} solicitud
 * @returns {string}
 */
export function enlaceSolicitudPorCorreo(correo, solicitud) {
  const lavadero = solicitud.lavadero.trim();
  const cuerpo = [
    'Hola, quiero agendar una demo de Corefaze.',
    '',
    `Nombre: ${solicitud.nombre.trim()}`,
    `Lavadero: ${lavadero}`,
    `Ciudad: ${solicitud.ciudad.trim()}`,
    `WhatsApp: ${solicitud.whatsapp.trim()}`,
    `Sedes: ${SEDES[solicitud.sedes] ?? solicitud.sedes}`,
  ].join('\n');
  const asunto = `Solicitud de demo · ${lavadero}`;
  return `mailto:${correo}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
