import { Avatar } from '@/components/ui/Avatar';
import { IconoFlechaDerecha } from '@/components/ui/iconos/IconoFlechaDerecha';
import { Insignia } from '@/components/ui/Insignia';
import { Placa } from '@/components/ui/Placa';
import { ESTADOS_ACTIVIDAD } from '@/constants/dominio';
import { etiquetaEstadoActividad, etiquetaTipoCliente } from '@/constants/etiquetas';
import { formatoTelefono } from '@/utils/formatoTelefono';

/** Columnas del diseño: cliente, vehículos y tres datos cortos, más la flecha. */
const COLUMNAS = 'grid-cols-[minmax(210px,1.7fr)_minmax(130px,1fr)_96px_118px_96px_28px]';

/**
 * Lista de clientes con la cuadrícula del diseño. Cada fila abre el detalle.
 * Las columnas de visitas y gasto del diseño necesitan agregados que la API
 * no entrega; en su lugar van tipo, crédito y estado del cliente.
 *
 * @param {object} props
 * @param {object[]} props.clientes
 * @param {(clienteId: number) => { placa: string }[]} props.vehiculosDe
 * @param {(cliente: object) => void} props.alElegir
 */
export function ListaClientes({ clientes, vehiculosDe, alElegir }) {
  return (
    <div className="overflow-x-auto overflow-y-hidden">
      <div
        aria-hidden="true"
        className={`grid ${COLUMNAS} min-w-180 gap-3 border-b border-neutro-150 px-4 py-2.75 text-encabezado-tabla whitespace-nowrap text-neutro-500 uppercase`}
      >
        <span>Cliente</span>
        <span>Vehículos</span>
        <span>Tipo</span>
        <span>Crédito</span>
        <span>Estado</span>
        <span />
      </div>
      <ul aria-label="Clientes">
        {clientes.map((cliente) => (
          <li key={cliente.id}>
            <button
              type="button"
              onClick={() => alElegir(cliente)}
              aria-label={`Ver el detalle de ${cliente.nombre}`}
              className={`grid w-full ${COLUMNAS} min-w-180 items-center gap-3 border-b border-neutro-100 px-4 py-2 text-left text-control text-neutro-900 transition-colors duration-150 hover:bg-neutro-25 escritorio:h-12`}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar nombre={cliente.nombre} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{cliente.nombre}</span>
                  <span className="block text-meta text-neutro-450 tabular-nums">{formatoTelefono(cliente.telefono)}</span>
                </span>
              </span>
              <span className="flex flex-wrap gap-1.25">
                {vehiculosDe(cliente.id).map((vehiculo) => (
                  <Placa key={vehiculo.id} placa={vehiculo.placa} tamano="pequeno" />
                ))}
              </span>
              <span className="text-neutro-650">{etiquetaTipoCliente(cliente.tipo)}</span>
              <span>
                {cliente.creditoHabilitado ? <Insignia tono="primario">Habilitado</Insignia> : <span className="text-neutro-450">—</span>}
              </span>
              <span>
                <Insignia tono={cliente.estado === ESTADOS_ACTIVIDAD.ACTIVO ? 'exito' : 'neutro'}>
                  {etiquetaEstadoActividad(cliente.estado)}
                </Insignia>
              </span>
              <IconoFlechaDerecha className="size-3.5 justify-self-end text-neutro-375" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
