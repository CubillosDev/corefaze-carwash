import { Link } from 'react-router';

import { Contador } from '@/components/ui/Contador';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { IconoFlechaDerecha } from '@/components/ui/iconos/IconoFlechaDerecha';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { ESTADOS_ORDEN } from '@/constants/dominio';
import { RUTAS } from '@/constants/rutas';
import { plural } from '@/utils/plural';

const TONOS_MARCA = {
  advertencia: 'text-advertencia-fuerte',
  neutro: 'text-neutro-700',
};

/**
 * Situaciones que piden una acción, armadas solo con el estado que devolvió la
 * API (sin jornada abierta, vehículos listos para entregar, órdenes por
 * iniciar). El diseño también avisaba de inventario bajo y cobros pendientes:
 * esos módulos no existen en el dominio.
 */
function situaciones({ jornada, conteo }) {
  if (!jornada) {
    return [
      {
        clave: 'sin-jornada',
        marca: '!',
        tono: 'advertencia',
        titulo: 'No hay jornada abierta',
        apoyo: 'Ábrela para registrar órdenes',
        hacia: RUTAS.JORNADAS,
      },
    ];
  }
  const lista = [];
  if (conteo[ESTADOS_ORDEN.TERMINADA] > 0) {
    lista.push({
      clave: 'por-entregar',
      marca: '✓',
      tono: 'neutro',
      titulo: `${plural(conteo[ESTADOS_ORDEN.TERMINADA], 'vehículo listo', 'vehículos listos')} para entregar`,
      apoyo: 'Terminados en el tablero',
      hacia: RUTAS.ORDENES_LAVADO,
    });
  }
  if (conteo[ESTADOS_ORDEN.REGISTRADA] > 0) {
    lista.push({
      clave: 'por-iniciar',
      marca: '!',
      tono: 'advertencia',
      titulo: `${plural(conteo[ESTADOS_ORDEN.REGISTRADA], 'orden', 'órdenes')} por iniciar`,
      apoyo: 'Registradas sin pasar a proceso',
      hacia: RUTAS.ORDENES_LAVADO,
    });
  }
  return lista;
}

/**
 * Tarjeta "Requiere atención" del tablero.
 *
 * @param {object} props
 * @param {object|null} props.jornada
 * @param {Record<string, number>} props.conteo Órdenes por estado.
 */
export function RequiereAtencion({ jornada, conteo }) {
  const lista = situaciones({ jornada, conteo });

  return (
    <Tarjeta como="section" aria-labelledby="titulo-requiere-atencion" className="flex-[1_1_240px]">
      <div className="flex items-center gap-2">
        <h2 id="titulo-requiere-atencion" className="flex-1 text-titulo-tarjeta">
          Requiere atención
        </h2>
        <Contador tono="suave">{lista.length}</Contador>
      </div>

      <ul className="mt-2.5 flex flex-col gap-1.5">
        {lista.map((situacion) => (
          <li key={situacion.clave}>
            <Link
              to={situacion.hacia}
              className="flex items-center gap-2.5 rounded-bloque border border-neutro-150 bg-white px-2.5 py-1.75 text-neutro-900 transition-colors duration-150 hover:border-neutro-275 hover:bg-neutro-25 hover:text-neutro-900"
            >
              <span
                aria-hidden="true"
                className={`inline-flex size-7 shrink-0 items-center justify-center rounded-opcion bg-neutro-100 text-detalle font-bold ${TONOS_MARCA[situacion.tono]}`}
              >
                {situacion.marca}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-control font-semibold">{situacion.titulo}</span>
                <span className="mt-px block text-meta text-neutro-550">{situacion.apoyo}</span>
              </span>
              <IconoFlechaDerecha className="size-3.5 shrink-0 text-neutro-450" />
            </Link>
          </li>
        ))}
      </ul>
      {lista.length === 0 ? <EstadoVacio variante="punteado" titulo="Todo en orden" className="mt-2.5" /> : null}
    </Tarjeta>
  );
}
