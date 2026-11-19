import { httpCliente } from '@/lib/httpCliente';

/**
 * GET /api/reportes/resumen: ingresos y servicios por día, mix de servicios y
 * colaboradores del periodo, más los totales del periodo anterior de la misma
 * duración. Todo calculado por el servidor, sin órdenes anuladas.
 *
 * @param {{ desde: string, hasta: string }} periodo YYYY-MM-DD
 * @param {{ signal?: AbortSignal }} [opciones]
 */
export async function obtenerResumen(periodo, { signal } = {}) {
  const cuerpo = await httpCliente.obtener('reportes/resumen', { consulta: periodo, signal });
  return cuerpo.reporte;
}

/**
 * GET /api/reportes/ingresos-por-hora: la curva de un día y la de la jornada anterior.
 *
 * @param {string} fecha YYYY-MM-DD
 * @param {{ signal?: AbortSignal }} [opciones]
 */
export async function obtenerIngresosPorHora(fecha, { signal } = {}) {
  const cuerpo = await httpCliente.obtener('reportes/ingresos-por-hora', { consulta: { fecha }, signal });
  return cuerpo.curva;
}
