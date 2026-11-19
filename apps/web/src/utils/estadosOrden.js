import { ESTADOS_ORDEN, TRANSICIONES_ORDEN } from '@/constants/dominio';
import { etiquetaEstadoOrden } from '@/constants/etiquetas';

/**
 * Fases por las que pasa una orden en el tablero, en el orden del contrato.
 * La cancelada queda fuera: no es una fase del patio.
 */
export const FASES_DEL_TABLERO = Object.freeze([
  ESTADOS_ORDEN.REGISTRADA,
  ESTADOS_ORDEN.EN_PROCESO,
  ESTADOS_ORDEN.TERMINADA,
  ESTADOS_ORDEN.ENTREGADA,
]);

/**
 * Estados a los que puede pasar una orden, tomados de transicionesOrden en
 * dominio.json. Sin el permiso de anular, la cancelación no se ofrece. Solo
 * decide qué se muestra: la transición la valida la API.
 *
 * @param {string} estado
 * @param {boolean} puedeAnular
 * @returns {string[]}
 */
export function siguientesEstados(estado, puedeAnular) {
  return (TRANSICIONES_ORDEN[estado] ?? []).filter(
    (siguiente) => puedeAnular || siguiente !== ESTADOS_ORDEN.CANCELADA,
  );
}

/**
 * Qué pasa al soltar una orden en la columna de otro estado del tablero:
 * "cambiar" si es su fase siguiente, "cobrar" si es Entregada (la entrega se
 * registra al cobrar en caja, ADR 0007) y null si no es un movimiento
 * permitido. La cancelación no se hace arrastrando: pide un motivo.
 *
 * @param {string} estado
 * @param {string|null} destino
 * @returns {'cambiar'|'cobrar'|null}
 */
export function accionAlSoltar(estado, destino) {
  if (!destino || destino === ESTADOS_ORDEN.CANCELADA || !(TRANSICIONES_ORDEN[estado] ?? []).includes(destino)) {
    return null;
  }
  return destino === ESTADOS_ORDEN.ENTREGADA ? 'cobrar' : 'cambiar';
}

/**
 * Por qué una orden no se puede soltar en otra columna.
 *
 * @param {string} estado
 * @returns {string} Por ejemplo, "Registrada solo avanza a En proceso".
 */
export function motivoMovimientoNoPermitido(estado) {
  const [siguiente] = (TRANSICIONES_ORDEN[estado] ?? []).filter((destino) => destino !== ESTADOS_ORDEN.CANCELADA);
  if (!siguiente) {
    return `Una orden ${etiquetaEstadoOrden(estado).toLowerCase()} ya no cambia de fase`;
  }
  return `${etiquetaEstadoOrden(estado)} solo avanza a ${etiquetaEstadoOrden(siguiente)}`;
}

/**
 * Porcentaje de la barra de avance de una tarjeta según su fase.
 *
 * @param {string} estado
 * @returns {number} De 0 a 100.
 */
export function avanceDeFase(estado) {
  const indice = FASES_DEL_TABLERO.indexOf(estado);
  return indice < 0 ? 0 : ((indice + 1) / FASES_DEL_TABLERO.length) * 100;
}

/**
 * Cuántas órdenes hay en cada estado, para los contadores del tablero. Solo
 * cuenta lo que devolvió la API; no calcula valores.
 *
 * @param {{ estado: string }[]} ordenes
 * @returns {Record<string, number>}
 */
export function contarPorEstado(ordenes) {
  const conteo = Object.fromEntries(Object.values(ESTADOS_ORDEN).map((estado) => [estado, 0]));
  for (const { estado } of ordenes) {
    conteo[estado] = (conteo[estado] ?? 0) + 1;
  }
  return conteo;
}
