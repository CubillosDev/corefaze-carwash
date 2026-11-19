import { httpCliente } from '@/lib/httpCliente';

/**
 * @typedef {object} EmpresaCredito
 * @property {number} id
 * @property {string} nombre
 * @property {string} documento NIT.
 * @property {string} telefono
 * @property {string} estado
 * @property {boolean} creditoHabilitado
 * @property {number|null} cupoCredito
 * @property {number|null} diaCorte
 * @property {string|null} contacto
 * @property {number} saldoPendiente Calculado por el servidor.
 * @property {number} saldoPagable Lo entregado y sin pagar.
 * @property {number} cantidadOrdenesPagables
 */

/**
 * GET /api/credito/clientes: empresas con crédito o con deuda.
 *
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<EmpresaCredito[]>}
 */
export async function listarEmpresasCredito({ signal } = {}) {
  const cuerpo = await httpCliente.obtener('credito/clientes', { signal });
  return cuerpo.clientes;
}

/**
 * GET /api/credito/clientes/:id/ordenes: servicios a crédito pendientes o pagados.
 *
 * @param {number} clienteId
 * @param {'pendientes'|'pagadas'} tipo
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<object[]>}
 */
export async function listarOrdenesEmpresa(clienteId, tipo, { signal } = {}) {
  const cuerpo = await httpCliente.obtener(`credito/clientes/${clienteId}/ordenes`, {
    consulta: { tipo },
    signal,
  });
  return cuerpo.ordenes;
}

/**
 * PATCH /api/credito/clientes/:id/condiciones: cupo, día de corte y contacto.
 *
 * @param {number} clienteId
 * @param {{ cupoCredito: number|null, diaCorte: number|null, contacto: string|null }} condiciones
 * @returns {Promise<EmpresaCredito>}
 */
export async function actualizarCondiciones(clienteId, condiciones) {
  const cuerpo = await httpCliente.actualizar(`credito/clientes/${clienteId}/condiciones`, condiciones);
  return cuerpo.cliente;
}

/**
 * POST /api/credito/vales/verificacion: busca el vale y, si es de la empresa
 * y está pendiente, lo marca como recibido.
 *
 * @param {number} clienteId
 * @param {string} numero
 * @returns {Promise<{ resultado: 'coincide'|'pagado'|'otra_empresa'|'no_existe', vale: object|null }>}
 */
export async function verificarVale(clienteId, numero) {
  const cuerpo = await httpCliente.crear('credito/vales/verificacion', { clienteId, numero });
  return cuerpo.verificacion;
}

/**
 * PATCH /api/credito/vales/:ordenId: casilla de vale recibido.
 *
 * @param {number} ordenId
 * @param {boolean} verificado
 */
export async function marcarVale(ordenId, verificado) {
  const cuerpo = await httpCliente.actualizar(`credito/vales/${ordenId}`, { verificado });
  return cuerpo.vale;
}

/**
 * POST /api/credito/vales: vale de una orden a crédito que no lo tiene.
 *
 * @param {number} ordenId
 * @param {string} numero
 */
export async function registrarVale(ordenId, numero) {
  const cuerpo = await httpCliente.crear('credito/vales', { ordenId, numero });
  return cuerpo.vale;
}

/**
 * POST /api/credito/pagos: paga completas las órdenes con vale verificado.
 *
 * @param {{ clienteId: number, ordenIds: number[], medio: 'transferencia'|'cheque'|'efectivo' }} pago
 */
export async function registrarPagoCredito(pago) {
  const cuerpo = await httpCliente.crear('credito/pagos', pago);
  return cuerpo.pago;
}
