import { httpCliente } from '@/lib/httpCliente';

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
 * @returns {Promise<Array<{ id: number, jornadaId: number, fecha: string, turno: number, vehiculoId: number, servicioId: number, valor: number, medioPago: string, estado: string }>>}
 */
export async function listarOrdenesDeVehiculo(vehiculoId, { signal } = {}) {
  const cuerpo = await httpCliente.obtener('ordenes-lavado', { signal });
  return cuerpo.ordenes.filter((orden) => orden.vehiculoId === Number(vehiculoId));
}
