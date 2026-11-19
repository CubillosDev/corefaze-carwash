import { httpCliente } from '@/lib/httpCliente';

/**
 * @typedef {object} Insumo
 * @property {number} id
 * @property {string} nombre
 * @property {string} categoria
 * @property {string} unidad
 * @property {number} stock
 * @property {number} stockMinimo
 * @property {boolean} stockBajo Lo decide el servidor (stock < mínimo).
 * @property {'activo'|'inactivo'} estado
 */

/**
 * GET /api/inventario
 *
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<Insumo[]>}
 */
export async function listarInsumos({ signal } = {}) {
  const cuerpo = await httpCliente.obtener('inventario', { signal });
  return cuerpo.insumos;
}

/**
 * POST /api/inventario: el stock inicial entra como primer movimiento.
 *
 * @param {{ nombre: string, categoria: string, unidad: string, stockMinimo: number, stockInicial?: number }} datos
 * @returns {Promise<Insumo>}
 */
export async function crearInsumo(datos) {
  const cuerpo = await httpCliente.crear('inventario', datos);
  return cuerpo.insumo;
}

/**
 * PUT /api/inventario/:id: el stock no cambia aquí, solo con movimientos.
 *
 * @param {number} id
 * @param {{ nombre: string, categoria: string, unidad: string, stockMinimo: number }} datos
 * @returns {Promise<Insumo>}
 */
export async function actualizarInsumo(id, datos) {
  const cuerpo = await httpCliente.reemplazar(`inventario/${id}`, datos);
  return cuerpo.insumo;
}

/**
 * PATCH /api/inventario/:id/estado
 *
 * @param {number} id
 * @param {'activo'|'inactivo'} estado
 * @returns {Promise<Insumo>}
 */
export async function cambiarEstadoInsumo(id, estado) {
  const cuerpo = await httpCliente.actualizar(`inventario/${id}/estado`, { estado });
  return cuerpo.insumo;
}

/**
 * POST /api/inventario/:id/movimientos: suma (positivo) o resta (negativo).
 *
 * @param {number} id
 * @param {number} cantidad
 * @param {string|null} [observacion]
 * @returns {Promise<Insumo>}
 */
export async function moverInsumo(id, cantidad, observacion = null) {
  const cuerpo = await httpCliente.crear(`inventario/${id}/movimientos`, { cantidad, observacion });
  return cuerpo.insumo;
}

/**
 * GET /api/inventario/:id/movimientos: los últimos movimientos.
 *
 * @param {number} id
 * @param {{ signal?: AbortSignal }} [opciones]
 */
export async function listarMovimientos(id, { signal } = {}) {
  const cuerpo = await httpCliente.obtener(`inventario/${id}/movimientos`, { signal });
  return cuerpo.movimientos;
}
