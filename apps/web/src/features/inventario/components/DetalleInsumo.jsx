import { useCallback } from 'react';

import { Dato } from '@/components/ui/Dato';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { etiquetaEstadoActividad } from '@/constants/etiquetas';
import { listarMovimientos } from '@/features/inventario/api/inventario.api';
import { useCarga } from '@/hooks/useCarga';
import { formatoFechaHora } from '@/utils/formatoFecha';

/**
 * Detalle de un insumo en el panel lateral: sus datos y los últimos
 * movimientos de stock (entradas y salidas), del más reciente al más antiguo.
 *
 * @param {object} props
 * @param {import('@/features/inventario/api/inventario.api').Insumo} props.insumo
 */
export function DetalleInsumo({ insumo }) {
  const cargar = useCallback((signal) => listarMovimientos(insumo.id, { signal }), [insumo.id]);
  const movimientos = useCarga(cargar);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-titulo-cajon">{insumo.nombre}</p>
        <p className="mt-0.5 text-detalle text-neutro-600">{insumo.categoria}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        <Dato etiqueta="Stock">
          {insumo.stock} {insumo.unidad}
        </Dato>
        <Dato etiqueta="Mínimo">
          {insumo.stockMinimo} {insumo.unidad}
        </Dato>
        <Dato etiqueta="Estado">{etiquetaEstadoActividad(insumo.estado)}</Dato>
      </dl>
      <section aria-labelledby="titulo-movimientos-insumo">
        <h3 id="titulo-movimientos-insumo" className="text-etiqueta text-neutro-500 uppercase">
          Últimos movimientos
        </h3>
        {movimientos.situacion === 'cargando' ? <EstadoCarga texto="Cargando movimientos…" className="mt-3" /> : null}
        {movimientos.situacion === 'error' ? (
          <EstadoError mensaje={movimientos.error} alReintentar={movimientos.recargar} className="mt-3" />
        ) : null}
        {movimientos.situacion === 'listo' && movimientos.datos.length === 0 ? (
          <p className="mt-3 text-detalle text-neutro-450">Todavía no hay movimientos.</p>
        ) : null}
        {movimientos.situacion === 'listo' && movimientos.datos.length > 0 ? (
          <ul className="mt-2">
            {movimientos.datos.map((movimiento) => (
              <li key={movimiento.id} className="flex items-center justify-between gap-3 border-b border-neutro-100 py-2.5 text-control">
                <span className="min-w-0">
                  <span className="block text-meta text-neutro-450">{formatoFechaHora(movimiento.creadoEn)}</span>
                  <span className="block truncate text-neutro-700">{movimiento.observacion ?? (movimiento.cantidad > 0 ? 'Entrada' : 'Salida')}</span>
                </span>
                <span className="text-right whitespace-nowrap">
                  <span className={`block font-semibold tabular-nums ${movimiento.cantidad > 0 ? 'text-exito' : 'text-error'}`}>
                    {movimiento.cantidad > 0 ? `+${movimiento.cantidad}` : movimiento.cantidad}
                  </span>
                  <span className="block text-nota text-neutro-450">Quedó en {movimiento.stockResultante}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
