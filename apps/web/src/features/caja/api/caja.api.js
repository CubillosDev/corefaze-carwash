import { httpCliente } from '@/lib/httpCliente';

/**
 * @typedef {object} TotalesCaja Todos calculados por el servidor.
 * @property {number} cobrado
 * @property {number} cobros
 * @property {number} ticketPromedio
 * @property {Record<string, number>} porMedio
 * @property {number} egresos
 * @property {number} efectivoEsperado Base + cobros en efectivo − egresos.
 * @property {number} porCobrar
 * @property {number} vehiculosPorCobrar
 */

/**
 * GET /api/caja: la caja de una jornada (por defecto, la abierta) con sus
 * totales, cobros, egresos, órdenes por cobrar y en el patio.
 *
 * @param {{ jornadaId?: number }} [filtros]
 * @param {{ signal?: AbortSignal }} [opciones]
 */
export function obtenerEstadoCaja(filtros = {}, { signal } = {}) {
  return httpCliente.obtener('caja', { consulta: filtros, signal });
}

/**
 * POST /api/caja/apertura
 *
 * @param {number} baseInicial
 */
export async function abrirCaja(baseInicial) {
  const cuerpo = await httpCliente.crear('caja/apertura', { baseInicial });
  return cuerpo.caja;
}

/**
 * POST /api/caja/egresos
 *
 * @param {{ categoria: string, concepto: string|null, valor: number }} egreso
 */
export async function registrarEgreso(egreso) {
  const cuerpo = await httpCliente.crear('caja/egresos', egreso);
  return cuerpo.egreso;
}

/**
 * POST /api/caja/cobros: cobra y entrega una orden terminada. Nunca envía el
 * valor: se cobra el que fijó el servidor (R4).
 *
 * @param {{ ordenId: number, medioPago: string, recibido?: number|null, clienteId?: number|null, numeroVale?: string|null }} cobro
 */
export async function registrarCobro(cobro) {
  const cuerpo = await httpCliente.crear('caja/cobros', cobro);
  return cuerpo.cobro;
}

/**
 * POST /api/caja/cierre: cierra con el arqueo.
 *
 * @param {number} efectivoContado
 */
export async function cerrarCaja(efectivoContado) {
  const cuerpo = await httpCliente.crear('caja/cierre', { efectivoContado });
  return cuerpo.caja;
}

/**
 * POST /api/caja/:id/reapertura (solo superadmin)
 *
 * @param {number} id
 */
export async function reabrirCaja(id) {
  const cuerpo = await httpCliente.crear(`caja/${id}/reapertura`, undefined);
  return cuerpo.caja;
}

/**
 * GET /api/parametros: nombre, NIT, dirección y teléfono del negocio para el
 * encabezado del comprobante.
 *
 * @param {{ signal?: AbortSignal }} [opciones]
 */
export async function obtenerDatosNegocio({ signal } = {}) {
  const cuerpo = await httpCliente.obtener('parametros', { signal });
  return cuerpo.parametros;
}
