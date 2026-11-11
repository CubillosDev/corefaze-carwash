import { httpCliente } from '@/lib/httpCliente';

/**
 * GET /api/clientes
 *
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<Array<{ id: number, nombre: string, documento: string, tipo: string, telefono: string, email: string|null, creditoHabilitado: boolean, estado: string }>>}
 */
export async function listarClientes({ signal } = {}) {
  const cuerpo = await httpCliente.obtener('clientes', { signal });
  return cuerpo.clientes;
}
