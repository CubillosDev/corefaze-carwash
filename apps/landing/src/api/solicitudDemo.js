import { enlaceSolicitudPorCorreo } from '@/utils/solicitudDemo';

/**
 * Correo de contacto del negocio (VITE_CORREO_CONTACTO). Es público: queda en
 * el JavaScript del sitio. Todavía no hay un endpoint para las solicitudes.
 */
const CORREO_CONTACTO = (import.meta.env.VITE_CORREO_CONTACTO ?? '').trim();

/** @returns {boolean} El formulario tiene a dónde enviar la solicitud. */
export const hayDestinoDeSolicitudes = () => CORREO_CONTACTO !== '';

/**
 * Abre el correo de la persona con la solicitud lista para enviar. Cuando
 * exista un endpoint, solo cambia este archivo.
 *
 * @param {import('@/utils/solicitudDemo').SolicitudDemo} solicitud
 */
export function enviarSolicitudDemo(solicitud) {
  window.location.href = enlaceSolicitudPorCorreo(CORREO_CONTACTO, solicitud);
}
