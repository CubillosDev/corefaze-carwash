import { httpCliente } from '@/lib/httpCliente';

/**
 * @typedef {object} FilaNomina Calculada por el servidor (resumen_nomina_periodo).
 * @property {number} colaboradorId
 * @property {number} codigo
 * @property {string} nombre
 * @property {number} servicios
 * @property {number} producido
 * @property {number} comision
 * @property {{ prestamo: number, jabon: number, multa: number, cxc: number }} descuentos
 *   cxc es el saldo que viene de la quincena anterior.
 * @property {number} descuentosTotal
 * @property {number} neto
 * @property {number} saldoPendiente Pasa como cxc a la quincena siguiente.
 */

/**
 * @typedef {object} ResumenQuincena
 * @property {string} inicio
 * @property {string} fin
 * @property {boolean} liquidada
 * @property {number|null} liquidacionId
 * @property {boolean} puedeLiquidar La quincena terminó y no se ha liquidado.
 * @property {{ servicios: number, producido: number, comision: number, descuentos: number, neto: number, saldoPendiente: number }} totales
 * @property {FilaNomina[]} colaboradores
 * @property {object[]} descuentosDelPeriodo
 */

/**
 * GET /api/nomina/quincenas/resumen: inicio y fin deben ser exactamente los
 * de una quincena (1–15 o 16–fin de mes).
 *
 * @param {{ inicio: string, fin: string }} periodo
 * @param {{ signal?: AbortSignal }} [opciones]
 * @returns {Promise<ResumenQuincena>}
 */
export function obtenerResumenQuincena({ inicio, fin }, { signal } = {}) {
  return httpCliente.obtener('nomina/quincenas/resumen', { consulta: { inicio, fin }, signal });
}

/**
 * GET /api/nomina/liquidaciones/:id
 *
 * @param {number} id
 * @param {{ signal?: AbortSignal }} [opciones]
 */
export async function obtenerLiquidacion(id, { signal } = {}) {
  const cuerpo = await httpCliente.obtener(`nomina/liquidaciones/${id}`, { signal });
  return cuerpo.liquidacion;
}

/**
 * POST /api/nomina/descuentos: préstamo, jabón o multa en una fecha de una
 * quincena sin liquidar.
 *
 * @param {{ colaboradorId: number, tipo: 'prestamo'|'jabon'|'multa', valor: number, fecha: string, observacion: string|null }} descuento
 */
export async function registrarDescuento(descuento) {
  const cuerpo = await httpCliente.crear('nomina/descuentos', descuento);
  return cuerpo.descuento;
}

/**
 * POST /api/nomina/quincenas/liquidar: liquida una quincena terminada.
 *
 * @param {{ inicio: string, fin: string }} periodo
 */
export async function liquidarQuincena(periodo) {
  const cuerpo = await httpCliente.crear('nomina/quincenas/liquidar', periodo);
  return cuerpo.liquidacion;
}
