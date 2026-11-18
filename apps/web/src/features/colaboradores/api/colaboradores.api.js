import { httpCliente } from '@/lib/httpCliente';

/**
 * @typedef {object} Colaborador
 * @property {number} id
 * @property {number} codigo
 * @property {string} nombre
 * @property {string} documento
 * @property {string} telefono
 * @property {number} porcentajeComision Entre 0 y 1.
 * @property {string} tipoVinculacion Uno de TIPOS_VINCULACION.
 * @property {string} estado Uno de ESTADOS_ACTIVIDAD.
 * @property {string|null} inactivoDesde
 */

/**
 * GET /api/colaboradores
 *
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<Colaborador[]>}
 */
export async function listarColaboradores({ signal } = {}) {
  const cuerpo = await httpCliente.obtener('colaboradores', { signal });
  return cuerpo.colaboradores;
}

/**
 * POST /api/colaboradores
 *
 * @param {Omit<Colaborador, 'id'|'inactivoDesde'>} datos
 * @returns {Promise<Colaborador>}
 * @throws {import('@/lib/httpCliente').ErrorHttp} 400 o 409 (código o documento repetido).
 */
export async function crearColaborador(datos) {
  const cuerpo = await httpCliente.crear('colaboradores', datos);
  return cuerpo.colaborador;
}

/**
 * PUT /api/colaboradores/:id
 *
 * @param {number} id
 * @param {Partial<Colaborador>} datos
 * @returns {Promise<Colaborador>}
 */
export async function actualizarColaborador(id, datos) {
  const cuerpo = await httpCliente.reemplazar(`colaboradores/${id}`, datos);
  return cuerpo.colaborador;
}

/**
 * PATCH /api/colaboradores/:id/estado: los colaboradores no se borran, se
 * desactivan.
 *
 * @param {number} id
 * @param {string} estado Uno de ESTADOS_ACTIVIDAD.
 * @returns {Promise<Colaborador>}
 */
export async function cambiarEstadoColaborador(id, estado) {
  const cuerpo = await httpCliente.actualizar(`colaboradores/${id}/estado`, { estado });
  return cuerpo.colaborador;
}
