import { Insignia } from '@/components/ui/Insignia';
import { etiquetaEstadoOrden, tonoEstadoOrden } from '@/constants/etiquetas';

/**
 * Estado de una orden como insignia, con el tono de su fase.
 *
 * @param {{ estado: string }} props
 */
export function InsigniaEstadoOrden({ estado }) {
  return <Insignia tono={tonoEstadoOrden(estado)}>{etiquetaEstadoOrden(estado)}</Insignia>;
}
