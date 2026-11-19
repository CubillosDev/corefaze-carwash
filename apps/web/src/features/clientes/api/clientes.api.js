import { httpCliente } from '@/lib/httpCliente';

/**
 * @typedef {object} Cliente
 * @property {number} id
 * @property {string} nombre
 * @property {string} documento
 * @property {string} tipo Uno de TIPOS_CLIENTE.
 * @property {string} telefono
 * @property {string|null} email
 * @property {boolean} creditoHabilitado
 * @property {string} estado Uno de ESTADOS_ACTIVIDAD.
 */

/**
 * GET /api/clientes
 *
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<Cliente[]>}
 */
export async function listarClientes({ signal } = {}) {
  const cuerpo = await httpCliente.obtener('clientes', { signal });
  return cuerpo.clientes;
}

/**
 * POST /api/clientes
 *
 * @param {Omit<Cliente, 'id'>} datos
 * @returns {Promise<Cliente>}
 * @throws {import('@/lib/httpCliente').ErrorHttp} 400 o 409 (documento repetido).
 */
export async function crearCliente(datos) {
  const cuerpo = await httpCliente.crear('clientes', datos);
  return cuerpo.cliente;
}

/**
 * PUT /api/clientes/:id
 *
 * @param {number} id
 * @param {Partial<Cliente>} datos
 * @returns {Promise<Cliente>}
 */
export async function actualizarCliente(id, datos) {
  const cuerpo = await httpCliente.reemplazar(`clientes/${id}`, datos);
  return cuerpo.cliente;
}

/**
 * DELETE /api/clientes/:id
 *
 * @param {number} id
 * @returns {Promise<void>}
 * @throws {import('@/lib/httpCliente').ErrorHttp} 409 si tiene vehículos asociados.
 */
export async function eliminarCliente(id) {
  await httpCliente.eliminar(`clientes/${id}`);
}
