import { ESTADOS_JORNADA } from '@/constants/dominio';
import { listarJornadas } from '@/features/jornadas';
import { listarOrdenes } from '@/features/ordenes-lavado';
import { useCarga } from '@/hooks/useCarga';

async function cargarTablero(signal) {
  const jornadas = await listarJornadas({}, { signal });
  const jornada = jornadas.find((candidata) => candidata.estado === ESTADOS_JORNADA.ABIERTA) ?? null;
  if (!jornada) {
    return { jornada: null, ordenes: [], totales: null };
  }
  const { ordenes, totales } = await listarOrdenes({ jornadaId: jornada.id }, { signal });
  return { jornada, ordenes, totales };
}

/**
 * Datos del tablero de inicio: la jornada abierta (si la hay), sus órdenes y
 * los totales que calcula el servidor.
 */
export function useTablero() {
  return useCarga(cargarTablero);
}
