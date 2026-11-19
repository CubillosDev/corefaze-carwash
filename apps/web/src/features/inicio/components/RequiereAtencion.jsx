import { Link } from 'react-router';

import { Contador } from '@/components/ui/Contador';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { IconoFlechaDerecha } from '@/components/ui/iconos/IconoFlechaDerecha';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { etiquetaEstadoOrden } from '@/constants/etiquetas';
import { RUTAS } from '@/constants/rutas';
import { formatoMinutos, minutosDesde } from '@/utils/formatoMinutos';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';
import { plural } from '@/utils/plural';

const TONOS_MARCA = {
  advertencia: 'text-advertencia-fuerte',
  neutro: 'text-neutro-700',
};

/** Desde cuántos minutos en el patio un vehículo se considera demorado, como en el diseño. */
const MINUTOS_DEMORA = 30;
/** El diseño muestra a lo sumo tres situaciones; el contador dice cuántas hay. */
const MAXIMO_VISIBLES = 3;

/**
 * Situaciones que piden una acción, en el orden del diseño: vehículos
 * demorados en el patio, cobros pendientes en la caja e insumos bajo el
 * mínimo. Todo sale de lo que devolvió la API.
 */
function situaciones({ jornada, caja, insumos, ahora }) {
  const lista = [];
  if (!jornada) {
    lista.push({
      clave: 'sin-jornada',
      marca: '!',
      tono: 'advertencia',
      titulo: 'No hay jornada abierta',
      apoyo: 'Ábrela para registrar órdenes',
      hacia: RUTAS.JORNADAS,
    });
  }

  (caja?.enPatio ?? [])
    .map((orden) => ({ orden, minutos: minutosDesde(orden.creadoEn, ahora) }))
    .filter(({ minutos }) => minutos >= MINUTOS_DEMORA)
    .sort((a, b) => b.minutos - a.minutos)
    .slice(0, 2)
    .forEach(({ orden, minutos }) =>
      lista.push({
        clave: `demora-${orden.id}`,
        marca: '!',
        tono: 'advertencia',
        titulo: `${formatoPlaca(orden.vehiculo?.placa ?? '')} demorado`,
        apoyo: `${formatoMinutos(minutos)} en patio · ${etiquetaEstadoOrden(orden.estado)}`,
        hacia: `${RUTAS.ORDENES_LAVADO}/${orden.id}`,
      }),
    );

  const porCobrar = caja?.totales?.vehiculosPorCobrar ?? 0;
  if (porCobrar > 0) {
    lista.push({
      clave: 'por-cobrar',
      marca: '$',
      tono: 'neutro',
      titulo: `${plural(porCobrar, 'vehículo espera', 'vehículos esperan')} cobro`,
      apoyo: `Terminados · ${formatoMoneda(caja.totales.porCobrar)}`,
      hacia: RUTAS.CAJA,
    });
  }

  (insumos ?? [])
    .filter((insumo) => insumo.estado === 'activo' && insumo.stockBajo)
    .slice(0, 2)
    .forEach((insumo) =>
      lista.push({
        clave: `insumo-${insumo.id}`,
        marca: '↓',
        tono: 'neutro',
        titulo: `${insumo.nombre} bajo`,
        apoyo: `${insumo.stock} ${insumo.unidad} · mínimo ${insumo.stockMinimo}`,
        hacia: RUTAS.INVENTARIO,
      }),
    );

  return lista;
}

/**
 * Tarjeta "Requiere atención" del tablero.
 *
 * @param {object} props
 * @param {object|null} props.jornada
 * @param {object|null} props.caja Estado de la caja (GET /api/caja); null si no se pudo cargar.
 * @param {object[]|null} props.insumos Null si no se pudo cargar el inventario.
 * @param {number} props.ahora Instante de la carga, en milisegundos.
 */
export function RequiereAtencion({ jornada, caja, insumos, ahora }) {
  const lista = situaciones({ jornada, caja, insumos, ahora });

  return (
    <Tarjeta como="section" aria-labelledby="titulo-requiere-atencion" className="flex-[1_1_240px]">
      <div className="flex items-center gap-2">
        <h2 id="titulo-requiere-atencion" className="flex-1 text-titulo-tarjeta">
          Requiere atención
        </h2>
        <Contador tono="suave">{lista.length}</Contador>
      </div>

      <ul className="mt-2.5 flex flex-col gap-1.5">
        {lista.slice(0, MAXIMO_VISIBLES).map((situacion) => (
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
                <span className="block truncate text-control font-semibold">{situacion.titulo}</span>
                <span className="mt-px block truncate text-meta text-neutro-550">{situacion.apoyo}</span>
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
