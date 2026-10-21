import { httpCliente } from '@/lib/httpCliente';

/**
 * GET /api/servicios
 *
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<Array<{ id: number, numero: number, nombre: string, descripcion: string, categoria: string, activo: boolean }>>}
 */
export async function listarServicios({ signal } = {}) {
  const cuerpo = await httpCliente.obtener('servicios', { signal });
  return cuerpo.servicios;
}
