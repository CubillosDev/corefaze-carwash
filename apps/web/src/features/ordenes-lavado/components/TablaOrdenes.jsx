import { Link } from 'react-router';

import { Placa } from '@/components/ui/Placa';
import { Tabla } from '@/components/ui/Tabla';
import { etiquetaTipoVehiculo } from '@/constants/etiquetas';
import { RUTAS } from '@/constants/rutas';
import { InsigniaEstadoOrden } from '@/features/ordenes-lavado/components/InsigniaEstadoOrden';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';

/**
 * Vista de lista de las órdenes de la jornada, con las columnas del diseño. El
 * valor es el que calculó el servidor. La placa abre el detalle.
 *
 * @param {object} props
 * @param {object[]} props.ordenes
 * @param {(orden: object) => { vehiculo: object|null, servicio: object|null, colaborador: object|null }} props.datosDe
 */
export function TablaOrdenes({ ordenes, datosDe }) {
  const filas = ordenes.map((orden) => ({ ...orden, ...datosDe(orden) }));

  const columnas = [
    {
      clave: 'placa',
      titulo: 'Placa',
      render: (fila) => (
        <Link
          to={`${RUTAS.ORDENES_LAVADO}/${fila.id}`}
          aria-label={`Ver la orden de ${formatoPlaca(fila.vehiculo?.placa)}`}
          className="rounded-placa"
        >
          <Placa placa={fila.vehiculo?.placa ?? ''} />
        </Link>
      ),
    },
    {
      clave: 'vehiculo',
      titulo: 'Vehículo',
      render: (fila) => (
        <span className="font-semibold">
          {fila.vehiculo?.marca || etiquetaTipoVehiculo(fila.vehiculo?.tipoVehiculo)}
        </span>
      ),
    },
    {
      clave: 'servicio',
      titulo: 'Servicio',
      render: (fila) => <span className="text-neutro-650">{fila.servicio?.nombre ?? '—'}</span>,
    },
    { clave: 'estado', titulo: 'Estado', render: (fila) => <InsigniaEstadoOrden estado={fila.estado} /> },
    {
      clave: 'colaborador',
      titulo: 'Colaborador',
      render: (fila) => <span className="text-neutro-650">{fila.colaborador?.nombre ?? '—'}</span>,
    },
    {
      clave: 'turno',
      titulo: 'Turno',
      render: (fila) => <span className="text-neutro-450 tabular-nums">{fila.turno}</span>,
    },
    {
      clave: 'valor',
      titulo: 'Valor',
      alineacion: 'derecha',
      render: (fila) => <span className="font-semibold tabular-nums">{formatoMoneda(fila.valor)}</span>,
    },
  ];

  return (
    <Tabla
      columnas={columnas}
      filas={filas}
      descripcion="Órdenes de lavado de la jornada"
      mensajeVacio="No hay órdenes en esta jornada."
      className="mt-3.5"
    />
  );
}
