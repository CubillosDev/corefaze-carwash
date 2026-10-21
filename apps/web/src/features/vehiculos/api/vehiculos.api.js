import { httpCliente } from '@/lib/httpCliente';

/**
 * @typedef {object} Vehiculo
 * @property {number} id
 * @property {string} placa Siempre en mayúsculas y sin separadores (ABC123, ABC12D).
 * @property {string} tipoVehiculo Uno de TIPOS_VEHICULO.
 * @property {string|null} marca
 * @property {string|null} color
 * @property {number} clienteId
 */

/**
 * GET /api/vehiculos
 *
 * La API todavía no filtra por placa (`?placa=`): devuelve todos los vehículos
 * y la búsqueda se hace en el panel (ver useVehiculos).
 *
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<Vehiculo[]>}
 */
export async function listarVehiculos({ signal } = {}) {
  const cuerpo = await httpCliente.obtener('vehiculos', { signal });
  return cuerpo.vehiculos;
}

/**
 * POST /api/vehiculos
 *
 * @param {{ placa: string, tipoVehiculo: string, clienteId: number, marca?: string, color?: string }} datos
 * @returns {Promise<Vehiculo>}
 * @throws {import('@/lib/httpCliente').ErrorHttp} 400 (datos), 404 (cliente), 409 (placa repetida).
 */
export async function crearVehiculo(datos) {
  const cuerpo = await httpCliente.crear('vehiculos', datos);
  return cuerpo.vehiculo;
}

/**
 * PUT /api/vehiculos/:id
 *
 * @param {number} id
 * @param {{ placa?: string, tipoVehiculo?: string, clienteId?: number, marca?: string, color?: string }} datos
 * @returns {Promise<Vehiculo>}
 * @throws {import('@/lib/httpCliente').ErrorHttp} 400, 404 o 409.
 */
export async function actualizarVehiculo(id, datos) {
  const cuerpo = await httpCliente.reemplazar(`vehiculos/${id}`, datos);
  return cuerpo.vehiculo;
}

/**
 * DELETE /api/vehiculos/:id
 *
 * @param {number} id
 * @returns {Promise<void>}
 * @throws {import('@/lib/httpCliente').ErrorHttp} 404, o 409 si tiene órdenes de lavado.
 */
export async function eliminarVehiculo(id) {
  await httpCliente.eliminar(`vehiculos/${id}`);
}
