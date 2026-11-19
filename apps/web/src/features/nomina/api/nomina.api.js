import { httpCliente } from '@/lib/httpCliente';

/**
 * @typedef {object} FilaNomina Calculada por el servidor (resumen_nomina_periodo).
 * @property {number} colaboradorId
 * @property {number} codigo
 * @property {string} nombre
 * @property {number} servicios
 * @property {number} producido
 * @property {number} comision
 * @property {number} prestamos
 * @property {number} jabon
 * @property {number} multas
 * @property {number} cxc Saldo de la quincena anterior.
 * @property {number} descuentos
 * @property {number} neto
 * @property {number} saldoPendiente Pasa como cxc a la quincena siguiente.
 */

/**
 * GET /api/nomina/quincena: la quincena que contiene la fecha (por defecto, hoy).
 *
 * @param {string|null} fecha YYYY-MM-DD
 * @param {{ signal?: AbortSignal }} [opciones]
 */
export async function obtenerQuincena(fecha, { signal } = {}) {
  const cuerpo = await httpCliente.obtener('nomina/quincena', { consulta: fecha ? { fecha } : {}, signal });
  return cuerpo.quincena;
}

/**
 * POST /api/nomina/descuentos: préstamo, jabón o multa con la fecha de hoy.
 *
 * @param {{ colaboradorId: number, tipo: 'prestamo'|'jabon'|'multa', valor: number, observacion: string|null }} descuento
 */
export async function registrarDescuento(descuento) {
  const cuerpo = await httpCliente.crear('nomina/descuentos', descuento);
  return cuerpo.descuento;
}

/**
 * POST /api/nomina/liquidaciones: liquida una quincena terminada.
 *
 * @param {{ inicio: string, fin: string }} periodo
 */
export async function liquidarQuincena(periodo) {
  const cuerpo = await httpCliente.crear('nomina/liquidaciones', periodo);
  return cuerpo.liquidacion;
}
