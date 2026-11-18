import { httpCliente } from '@/lib/httpCliente';

/**
 * @typedef {object} OrdenLavado
 * @property {number} id
 * @property {number} jornadaId
 * @property {string} fecha Fecha sin hora (2026-08-03).
 * @property {number} turno
 * @property {number} vehiculoId
 * @property {number} servicioId
 * @property {number} colaboradorId
 * @property {number|null} clienteId
 * @property {number} valor Lo calcula el servidor (R4).
 * @property {string} medioPago Uno de MEDIOS_PAGO.
 * @property {boolean} autorizaMotor
 * @property {string|null} observaciones
 * @property {string|null} motivo
 * @property {string} estado Uno de ESTADOS_ORDEN.
 * @property {string} creadaEn Fecha y hora ISO.
 */

/**
 * @typedef {object} TotalesOrdenes Calculados por el servidor sobre las órdenes no anuladas.
 * @property {number} cantidadServicios
 * @property {number} totalGeneral
 * @property {Record<string, number>} totalesPorMedioPago
 */

/**
 * GET /api/ordenes-lavado
 *
 * @param {{ jornadaId?: number, fecha?: string, colaboradorId?: number, servicioId?: number, medioPago?: string }} [filtros]
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<{ ordenes: OrdenLavado[], totales: TotalesOrdenes }>}
 */
export async function listarOrdenes(filtros = {}, { signal } = {}) {
  const cuerpo = await httpCliente.obtener('ordenes-lavado', { consulta: filtros, signal });
  return { ordenes: cuerpo.ordenes, totales: cuerpo.totales };
}

/**
 * Órdenes de lavado de un vehículo.
 *
 * GET /api/ordenes-lavado todavía no filtra por vehículo (solo por fecha,
 * colaborador, servicio, medio de pago y jornada), así que el filtro se aplica
 * aquí. Cuando la API acepte `vehiculoId`, se envía como consulta y esta
 * función no cambia para quien la usa.
 *
 * @param {number|string} vehiculoId
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<OrdenLavado[]>}
 */
export async function listarOrdenesDeVehiculo(vehiculoId, { signal } = {}) {
  const cuerpo = await httpCliente.obtener('ordenes-lavado', { signal });
  return cuerpo.ordenes.filter((orden) => orden.vehiculoId === Number(vehiculoId));
}

/**
 * POST /api/ordenes-lavado
 *
 * No envía valor ni estado: el servidor calcula el valor (R4) y toda orden
 * nace registrada.
 *
 * @param {{ turno: number, vehiculoId: number, servicioId: number, colaboradorId: number, medioPago: string, clienteId?: number, autorizaMotor?: boolean, observaciones?: string }} datos
 * @returns {Promise<OrdenLavado>}
 * @throws {import('@/lib/httpCliente').ErrorHttp} 400 (datos), 404 (referencias)
 *   o 409 (sin jornada abierta, turno ocupado, placa con orden abierta...).
 */
export async function crearOrden(datos) {
  const cuerpo = await httpCliente.crear('ordenes-lavado', datos);
  return cuerpo.orden;
}

/**
 * PATCH /api/ordenes-lavado/:id/estado (R9: el estado solo cambia por aquí).
 *
 * @param {number} id
 * @param {{ estado: string, motivo?: string }} cambio
 * @returns {Promise<OrdenLavado>}
 * @throws {import('@/lib/httpCliente').ErrorHttp} 403 (anular sin permiso) o
 *   409 (transición no permitida, orden cerrada).
 */
export async function cambiarEstadoOrden(id, { estado, motivo }) {
  const cuerpo = await httpCliente.actualizar(`ordenes-lavado/${id}/estado`, {
    estado,
    ...(motivo ? { motivo } : {}),
  });
  return cuerpo.orden;
}
