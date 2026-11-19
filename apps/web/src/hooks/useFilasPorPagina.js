import { useSyncExternalStore } from 'react';

import { usePantallaAngosta } from '@/hooks/usePantallaAngosta';

function suscribir(avisar) {
  window.addEventListener('resize', avisar);
  return () => window.removeEventListener('resize', avisar);
}

const leerAlto = () => window.innerHeight;

/**
 * Filas por página según el alto de la ventana, como la lista de clientes del
 * diseño: en pantalla angosta siempre las mismas; en escritorio, las filas que
 * caben después de reservar el encabezado, los filtros y el pie, dentro de un
 * mínimo y un máximo. Así la lista no desborda la pantalla.
 *
 * @param {object} [opciones]
 * @param {number} [opciones.reservado] Alto en px que ocupa todo lo que no es fila.
 * @param {number} [opciones.altoFila] Alto en px de cada fila.
 * @param {number} [opciones.minimo]
 * @param {number} [opciones.maximo]
 * @param {number} [opciones.enAngosta] Filas en pantalla angosta.
 * @returns {number}
 */
export function useFilasPorPagina({ reservado = 400, altoFila = 48, minimo = 6, maximo = 11, enAngosta = 10 } = {}) {
  const alto = useSyncExternalStore(suscribir, leerAlto, () => 900);
  const angosta = usePantallaAngosta();
  if (angosta) {
    return enAngosta;
  }
  return Math.max(minimo, Math.min(maximo, Math.floor((alto - reservado) / altoFila)));
}
