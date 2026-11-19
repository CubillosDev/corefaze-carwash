import { httpCliente } from '@/lib/httpCliente';

/**
 * @typedef {object} Jornada
 * @property {number} id
 * @property {string} fecha Fecha sin hora (2026-08-03).
 * @property {string} estado Uno de ESTADOS_JORNADA.
 * @property {string} abiertaEn Fecha y hora ISO.
 * @property {string|null} cerradaEn
 * @property {{ en: string }[]} reaperturas
 * @property {number} [unidades] Servicios no anulados, calculado por el servidor.
 * @property {number} [ventaTotal] Calculado por el servidor.
 */

/**
 * GET /api/jornadas
 *
 * @param {{ desde?: string, hasta?: string }} [filtros] Fechas sin hora.
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<Jornada[]>}
 */
export async function listarJornadas(filtros = {}, { signal } = {}) {
  const cuerpo = await httpCliente.obtener('jornadas', { consulta: filtros, signal });
  return cuerpo.jornadas;
}

/**
 * POST /api/jornadas/qr: código de un solo uso para abrir la jornada desde la
 * app móvil. Vence a los `vigenciaSegundos`; el servidor guarda solo su hash.
 *
 * @returns {Promise<{ contenido: string, expiraEn: string, vigenciaSegundos: number }>}
 */
export async function generarQrJornada() {
  const cuerpo = await httpCliente.crear('jornadas/qr', undefined);
  return cuerpo.qr;
}

/**
 * POST /api/jornadas: abre la jornada de hoy. No lleva cuerpo.
 *
 * @returns {Promise<Jornada>}
 * @throws {import('@/lib/httpCliente').ErrorHttp} 409 si ya hay una abierta o
 *   si hoy ya tuvo jornada.
 */
export async function abrirJornada() {
  const cuerpo = await httpCliente.crear('jornadas', undefined);
  return cuerpo.jornada;
}

/**
 * PATCH /api/jornadas/:id/estado: cierra o reabre una jornada.
 *
 * @param {number} id
 * @param {string} estado Uno de ESTADOS_JORNADA.
 * @returns {Promise<Jornada>}
 * @throws {import('@/lib/httpCliente').ErrorHttp} 403 (reabrir sin ser
 *   superadmin) o 409 (estado no permitido, otra jornada abierta).
 */
export async function cambiarEstadoJornada(id, estado) {
  const cuerpo = await httpCliente.actualizar(`jornadas/${id}/estado`, { estado });
  return cuerpo.jornada;
}
