import { Boton } from '@/components/ui/Boton';
import { Tabla } from '@/components/ui/Tabla';
import { etiquetaTipoVehiculo } from '@/constants/etiquetas';
import { formatoPlaca } from '@/utils/formatoPlaca';

const SIN_DATO = '—';

/**
 * Tabla de vehículos con las acciones de cada fila: historial, editar y
 * eliminar. Cada botón nombra la placa para quien usa lector de pantalla.
 * Editar y eliminar solo aparecen si se reciben sus funciones (el rol puede
 * gestionar vehículos).
 *
 * @param {object} props
 * @param {object[]} props.vehiculos
 * @param {(clienteId: number) => string} props.nombreDeCliente
 * @param {(vehiculo: object) => void} props.alVerHistorial
 * @param {(vehiculo: object) => void} [props.alEditar]
 * @param {(vehiculo: object) => void} [props.alEliminar]
 * @param {string} [props.mensajeVacio]
 */
export function TablaVehiculos({
  vehiculos,
  nombreDeCliente,
  alVerHistorial,
  alEditar,
  alEliminar,
  mensajeVacio,
}) {
  const columnas = [
    {
      clave: 'placa',
      titulo: 'Placa',
      render: (vehiculo) => (
        <span className="font-mono font-semibold whitespace-nowrap">{formatoPlaca(vehiculo.placa)}</span>
      ),
    },
    {
      clave: 'tipoVehiculo',
      titulo: 'Tipo',
      render: (vehiculo) => etiquetaTipoVehiculo(vehiculo.tipoVehiculo),
    },
    { clave: 'marca', titulo: 'Marca', render: (vehiculo) => vehiculo.marca || SIN_DATO },
    { clave: 'color', titulo: 'Color', render: (vehiculo) => vehiculo.color || SIN_DATO },
    {
      clave: 'clienteId',
      titulo: 'Cliente',
      render: (vehiculo) => nombreDeCliente(vehiculo.clienteId),
    },
    {
      clave: 'acciones',
      titulo: 'Acciones',
      alineacion: 'derecha',
      render: (vehiculo) => {
        const placa = formatoPlaca(vehiculo.placa);
        return (
          <div className="flex justify-end gap-1">
            <Boton
              variante="fantasma"
              tamano="pequeno"
              aria-label={`Ver historial del vehículo ${placa}`}
              onClick={() => alVerHistorial(vehiculo)}
            >
              Historial
            </Boton>
            {alEditar ? (
              <Boton
                variante="fantasma"
                tamano="pequeno"
                aria-label={`Editar vehículo ${placa}`}
                onClick={() => alEditar(vehiculo)}
              >
                Editar
              </Boton>
            ) : null}
            {alEliminar ? (
              <Boton
                variante="fantasma"
                tamano="pequeno"
                aria-label={`Eliminar vehículo ${placa}`}
                onClick={() => alEliminar(vehiculo)}
                className="text-error hover:not-disabled:bg-error-suave active:not-disabled:bg-error-suave focus-visible:outline-error"
              >
                Eliminar
              </Boton>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <Tabla
      columnas={columnas}
      filas={vehiculos}
      descripcion="Vehículos registrados, con su tipo, marca, color y cliente"
      mensajeVacio={mensajeVacio}
    />
  );
}
