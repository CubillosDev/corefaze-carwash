import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { IconoCargando } from '@/components/ui/iconos/IconoCargando';
import { Modal } from '@/components/ui/Modal';
import { Tabla } from '@/components/ui/Tabla';
import { etiquetaEstadoOrden } from '@/constants/etiquetas';
import { useHistorialVehiculo } from '@/features/vehiculos/hooks/useHistorialVehiculo';
import { formatoFecha } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';

const COLUMNAS = [
  { clave: 'fecha', titulo: 'Fecha', render: (orden) => formatoFecha(orden.fecha) },
  { clave: 'turno', titulo: 'Turno', alineacion: 'centro' },
  { clave: 'servicioNombre', titulo: 'Servicio' },
  {
    clave: 'estado',
    titulo: 'Estado',
    render: (orden) => etiquetaEstadoOrden(orden.estado),
  },
  {
    clave: 'valor',
    titulo: 'Valor',
    alineacion: 'derecha',
    render: (orden) => formatoMoneda(orden.valor),
  },
];

/**
 * Ventana con el historial de lavados de un vehículo (sus órdenes, de la más
 * reciente a la más antigua). Se monta solo mientras está abierta, así que
 * consulta la API cada vez que se abre.
 *
 * @param {object} props
 * @param {{ id: number, placa: string }} props.vehiculo
 * @param {() => void} props.alCerrar
 */
export function HistorialVehiculo({ vehiculo, alCerrar }) {
  const { situacion, error, ordenes, recargar } = useHistorialVehiculo(vehiculo.id);

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      tamano="grande"
      titulo={`Historial de lavados · ${formatoPlaca(vehiculo.placa)}`}
      pie={
        <Boton variante="secundario" onClick={alCerrar}>
          Cerrar
        </Boton>
      }
    >
      {situacion === 'cargando' ? (
        <p role="status" className="flex items-center gap-2 py-6 text-neutro-600">
          <IconoCargando />
          Cargando historial…
        </p>
      ) : null}

      {situacion === 'error' ? (
        <div className="flex flex-col items-start gap-3">
          <Alerta tipo="error" titulo="No pudimos cargar el historial" className="w-full">
            {error}
          </Alerta>
          <Boton variante="secundario" tamano="pequeno" onClick={recargar}>
            Reintentar
          </Boton>
        </div>
      ) : null}

      {situacion === 'listo' ? (
        <Tabla
          columnas={COLUMNAS}
          filas={ordenes}
          descripcion={`Órdenes de lavado del vehículo ${formatoPlaca(vehiculo.placa)}`}
          mensajeVacio="Este vehículo todavía no tiene lavados registrados."
        />
      ) : null}
    </Modal>
  );
}
