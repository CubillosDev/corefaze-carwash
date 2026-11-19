import { useCallback } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Dato } from '@/components/ui/Dato';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { Placa } from '@/components/ui/Placa';
import {
  etiquetaEstadoActividad,
  etiquetaEstadoOrden,
  etiquetaTipoCliente,
  etiquetaTipoVehiculo,
} from '@/constants/etiquetas';
import { listarOrdenes } from '@/features/ordenes-lavado';
import { listarServicios } from '@/features/servicios';
import { useCarga } from '@/hooks/useCarga';
import { formatoFecha } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';
import { formatoTelefono } from '@/utils/formatoTelefono';

const ULTIMOS = 5;

/**
 * Contenido del panel "Detalle del cliente": datos, vehículos y sus últimos
 * servicios. La API no filtra órdenes por vehículo, así que se piden todas y
 * se muestran las de los vehículos del cliente; el valor es el del servidor.
 *
 * @param {object} props
 * @param {object} props.cliente
 * @param {object[]} props.vehiculos Vehículos del cliente.
 */
export function DetalleCliente({ cliente, vehiculos }) {
  const idsVehiculos = vehiculos.map((vehiculo) => vehiculo.id).join(',');
  const cargarHistorial = useCallback(
    async (signal) => {
      const ids = new Set(idsVehiculos.split(',').filter(Boolean).map(Number));
      if (ids.size === 0) {
        return [];
      }
      const [{ ordenes }, servicios] = await Promise.all([
        listarOrdenes({}, { signal }),
        listarServicios({ signal }),
      ]);
      const nombreServicio = new Map(servicios.map((servicio) => [servicio.id, servicio]));
      return ordenes
        .filter((orden) => ids.has(orden.vehiculoId))
        .sort((a, b) => b.creadaEn.localeCompare(a.creadaEn))
        .slice(0, ULTIMOS)
        .map((orden) => ({ ...orden, servicio: nombreServicio.get(orden.servicioId) ?? null }));
    },
    [idsVehiculos],
  );
  const historial = useCarga(cargarHistorial);
  const placaDe = (vehiculoId) => vehiculos.find((vehiculo) => vehiculo.id === vehiculoId)?.placa ?? '';

  return (
    <>
      <div className="flex items-center gap-3.5">
        <Avatar nombre={cliente.nombre} tamano="grande" />
        <div className="min-w-0">
          <p className="text-titulo-cajon">{cliente.nombre}</p>
          <p className="mt-0.5 text-detalle text-neutro-550 tabular-nums">
            {formatoTelefono(cliente.telefono)} · Doc. {cliente.documento}
          </p>
        </div>
      </div>

      <dl className="mt-4.5 grid grid-cols-3 gap-2">
        <Dato etiqueta="Tipo">{etiquetaTipoCliente(cliente.tipo)}</Dato>
        <Dato etiqueta="Crédito">{cliente.creditoHabilitado ? 'Habilitado' : 'No'}</Dato>
        <Dato etiqueta="Estado">{etiquetaEstadoActividad(cliente.estado)}</Dato>
      </dl>

      <h3 className="mt-5.5 text-control font-semibold">Vehículos</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {vehiculos.map((vehiculo) => (
          <li key={vehiculo.id} className="flex items-center gap-2.5 rounded-bloque border border-neutro-150 px-3 py-2.5">
            <Placa placa={vehiculo.placa} />
            <span className="flex-1 text-control text-neutro-700">
              {[vehiculo.marca, etiquetaTipoVehiculo(vehiculo.tipoVehiculo)].filter(Boolean).join(' · ')}
            </span>
          </li>
        ))}
      </ul>
      {vehiculos.length === 0 ? <EstadoVacio variante="punteado" titulo="Sin vehículos registrados" className="mt-2" /> : null}

      <h3 className="mt-5.5 text-control font-semibold">Últimos servicios</h3>
      {historial.situacion === 'cargando' ? <EstadoCarga texto="Cargando servicios…" className="py-6" /> : null}
      {historial.situacion === 'error' ? (
        <EstadoError mensaje={historial.error} alReintentar={historial.recargar} className="mt-2" />
      ) : null}
      {historial.situacion === 'listo' ? (
        <ul className="mt-1 flex flex-col">
          {historial.datos.map((orden) => (
            <li key={orden.id} className="flex h-11.5 items-center gap-2.5 border-b border-neutro-75 text-control">
              <span className="inline-flex size-6.5 shrink-0 items-center justify-center rounded-opcion bg-primario-100 text-micro font-bold text-primario">
                {orden.servicio?.numero ?? '—'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{orden.servicio?.nombre ?? 'Servicio'}</span>
                <span className="block text-nota text-neutro-450">
                  {formatoFecha(orden.fecha)} · {formatoPlaca(placaDe(orden.vehiculoId))} ·{' '}
                  {etiquetaEstadoOrden(orden.estado)}
                </span>
              </span>
              <span className="font-semibold tabular-nums">{formatoMoneda(orden.valor)}</span>
            </li>
          ))}
          {historial.datos.length === 0 ? (
            <li>
              <EstadoVacio variante="punteado" titulo="Aún sin servicios" className="mt-1" />
            </li>
          ) : null}
        </ul>
      ) : null}
    </>
  );
}
