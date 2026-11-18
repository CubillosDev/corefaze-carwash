import { httpCliente } from '@/lib/httpCliente';

/**
 * @typedef {object} Servicio
 * @property {number} id
 * @property {number} numero
 * @property {string} nombre
 * @property {string|null} descripcion
 * @property {string|null} categoria Texto libre.
 * @property {boolean} activo
 * @property {{ tipoVehiculo: string, valor: number }[]} tarifas
 */

/**
 * GET /api/servicios
 *
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<Servicio[]>}
 */
export async function listarServicios({ signal } = {}) {
  const cuerpo = await httpCliente.obtener('servicios', { signal });
  return cuerpo.servicios;
}

/**
 * POST /api/servicios
 *
 * @param {Omit<Servicio, 'id'>} datos Las tarifas las escribe quien administra.
 * @returns {Promise<Servicio>}
 * @throws {import('@/lib/httpCliente').ErrorHttp} 400 o 409 (número repetido).
 */
export async function crearServicio(datos) {
  const cuerpo = await httpCliente.crear('servicios', datos);
  return cuerpo.servicio;
}

/**
 * PUT /api/servicios/:id
 *
 * @param {number} id
 * @param {Partial<Servicio>} datos
 * @returns {Promise<Servicio>}
 */
export async function actualizarServicio(id, datos) {
  const cuerpo = await httpCliente.reemplazar(`servicios/${id}`, datos);
  return cuerpo.servicio;
}

/**
 * DELETE /api/servicios/:id
 *
 * @param {number} id
 * @returns {Promise<void>}
 * @throws {import('@/lib/httpCliente').ErrorHttp} 409 si tiene órdenes asociadas.
 */
export async function eliminarServicio(id) {
  await httpCliente.eliminar(`servicios/${id}`);
}
