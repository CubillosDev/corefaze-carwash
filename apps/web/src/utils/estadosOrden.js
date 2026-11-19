import { ESTADOS_ORDEN, TRANSICIONES_ORDEN } from '@/constants/dominio';

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
