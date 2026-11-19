import { httpCliente } from '@/lib/httpCliente';

/**
 * @typedef {object} Usuario
 * @property {number} id
 * @property {string} nombre
 * @property {string} email
 * @property {string} rol Uno de los roles del dominio.
 * @property {boolean} activo
 * @property {string} creadoEn
 */

/**
 * GET /api/usuarios: paginado en el servidor y filtrable. Superadmin y
 * administrador.
 *
 * @param {{ rol?: string, activo?: boolean, busqueda?: string, pagina?: number, porPagina?: number }} filtros
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<{ usuarios: Usuario[], total: number, pagina: number, porPagina: number, totalPaginas: number }>}
 */
export function listarUsuarios(filtros, { signal } = {}) {
  return httpCliente.obtener('usuarios', { signal, consulta: filtros });
}

/**
 * PATCH /api/usuarios/:id/estado (solo superadmin). Los usuarios no se
 * borran: se desactivan. La API no deja desactivarse a uno mismo ni dejar el
 * sistema sin superadministradores activos (409).
 *
 * @param {number} id
 * @param {boolean} activo
 * @returns {Promise<Usuario>}
 */
export async function cambiarEstadoUsuario(id, activo) {
  const cuerpo = await httpCliente.actualizar(`usuarios/${id}/estado`, { activo });
  return cuerpo.usuario;
}

/**
 * PATCH /api/auth/usuarios/:id/rol (solo superadmin). Es la única vía para
 * que una cuenta deje de estar pendiente.
 *
 * @param {number} id
 * @param {string} rol
 * @returns {Promise<Usuario>}
 */
export async function asignarRol(id, rol) {
  const cuerpo = await httpCliente.actualizar(`auth/usuarios/${id}/rol`, { rol });
  return cuerpo.usuario;
}
