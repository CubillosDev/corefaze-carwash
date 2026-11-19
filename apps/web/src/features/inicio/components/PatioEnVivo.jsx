import { Link } from 'react-router';

import { Tarjeta } from '@/components/ui/Tarjeta';
import { ESTADOS_ORDEN } from '@/constants/dominio';
import { etiquetaEstadoOrden } from '@/constants/etiquetas';
import { RUTAS } from '@/constants/rutas';

/**
 * Fases de los vehículos que siguen en el patio (aún sin entregar), con la
 * escala azul del diseño: de la más clara (recién llegado) a la más oscura.
 */
const FASES_DEL_PATIO = [
  { estado: ESTADOS_ORDEN.REGISTRADA, color: 'bg-primario-200' },
  { estado: ESTADOS_ORDEN.EN_PROCESO, color: 'bg-primario-400' },
  { estado: ESTADOS_ORDEN.TERMINADA, color: 'bg-primario-800' },
];

/**
 * "Patio en vivo": cuántos vehículos hay en cada fase, con una barra que
 * reparte el ancho según esas cantidades. El diseño mostraba también el tiempo
 * medio por fase; la API no lo entrega y no se calcula aquí.
 *
 * @param {{ conteo: Record<string, number> }} props
 */
export function PatioEnVivo({ conteo }) {
  const total = FASES_DEL_PATIO.reduce((suma, { estado }) => suma + conteo[estado], 0);

  return (
    <Tarjeta como="section" aria-labelledby="titulo-patio" className="flex-[1_1_240px]">
      <div className="flex items-center justify-between">
        <h2 id="titulo-patio" className="text-titulo-tarjeta">
          Patio en vivo
        </h2>
        <Link to={RUTAS.ORDENES_LAVADO} className="py-1 text-detalle font-semibold">
          Ver tablero
        </Link>
      </div>

      <div aria-hidden="true" className="mt-3.5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-neutro-150">
        {total > 0
          ? FASES_DEL_PATIO.map(({ estado, color }) => (
              <span
                key={estado}
                className={`h-full transition-[width] duration-500 ${color}`}
                style={{ width: `${(conteo[estado] / total) * 100}%` }}
              />
            ))
          : null}
      </div>

      <ul className="mt-2.5 flex flex-col">
        {FASES_DEL_PATIO.map(({ estado, color }) => (
          <li
            key={estado}
            className="grid h-7.5 grid-cols-[1fr_auto] items-center gap-3 border-b border-neutro-75 text-control"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className={`size-1.75 rounded-full ${color}`} />
              {etiquetaEstadoOrden(estado)}
            </span>
            <span className="font-semibold tabular-nums">{conteo[estado]}</span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
