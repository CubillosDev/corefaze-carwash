import { useNavigate, useOutletContext, useParams } from 'react-router';

import { Boton } from '@/components/ui/Boton';
import { Dato } from '@/components/ui/Dato';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { PanelLateral } from '@/components/ui/PanelLateral';
import { Placa } from '@/components/ui/Placa';
import { ESTADOS_ORDEN } from '@/constants/dominio';
import { etiquetaEstadoOrden, etiquetaMedioPago, etiquetaTipoVehiculo } from '@/constants/etiquetas';
import { RUTAS } from '@/constants/rutas';
import { InsigniaEstadoOrden } from '@/features/ordenes-lavado/components/InsigniaEstadoOrden';
import { siguientesEstados } from '@/utils/estadosOrden';
import { formatoFecha, formatoFechaHora } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';

/**
 * Detalle de una orden en el panel lateral, sobre el tablero. Muestra lo que
 * devolvió la API (el valor lo calcula el servidor) y ofrece solo los cambios
 * de estado permitidos por transicionesOrden.
 */
export function DetalleOrdenPage() {
  const { idOrden } = useParams();
  const navegar = useNavigate();
  const { situacion, ordenes, datosDe, puedeAnular, ordenOcupada, alCambiarEstado } = useOutletContext();
  const orden = ordenes.find((candidata) => candidata.id === Number(idOrden)) ?? null;
  const cerrar = () => navegar(RUTAS.ORDENES_LAVADO);

  if (situacion !== 'listo' || !orden) {
    return (
      <PanelLateral abierto alCerrar={cerrar} titulo="Detalle de la orden">
        {situacion === 'cargando' ? (
          <EstadoCarga texto="Cargando la orden…" />
        ) : (
          <EstadoVacio
            titulo="No encontramos esta orden"
            descripcion="Puede pertenecer a otra jornada. Elige la jornada en el tablero e inténtalo de nuevo."
          />
        )}
      </PanelLateral>
    );
  }

  const { vehiculo, servicio, colaborador } = datosDe(orden);
  const siguientes = siguientesEstados(orden.estado, puedeAnular);
  const avances = siguientes.filter((estado) => estado !== ESTADOS_ORDEN.CANCELADA);
  const ocupada = ordenOcupada === orden.id;

  return (
    <PanelLateral
      abierto
      alCerrar={cerrar}
      titulo="Detalle de la orden"
      pie={
        siguientes.length > 0 ? (
          <>
            {siguientes.includes(ESTADOS_ORDEN.CANCELADA) ? (
              <Boton
                variante="secundario"
                tamano="grande"
                className="flex-1"
                disabled={ocupada}
                onClick={() => alCambiarEstado(orden, ESTADOS_ORDEN.CANCELADA)}
              >
                Anular orden
              </Boton>
            ) : null}
            {avances.map((estado) => (
              <Boton
                key={estado}
                tamano="grande"
                className="flex-1"
                cargando={ocupada}
                onClick={() => alCambiarEstado(orden, estado)}
              >
                Pasar a {etiquetaEstadoOrden(estado).toLowerCase()}
              </Boton>
            ))}
          </>
        ) : null
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Placa placa={vehiculo?.placa ?? ''} />
          <p className="mt-2 text-titulo-cajon">
            {vehiculo?.marca || etiquetaTipoVehiculo(vehiculo?.tipoVehiculo)}
          </p>
          <p className="mt-0.5 text-detalle text-neutro-550">
            {[vehiculo?.color, vehiculo?.marca ? etiquetaTipoVehiculo(vehiculo.tipoVehiculo) : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <InsigniaEstadoOrden estado={orden.estado} />
      </div>

      <dl className="mt-4.5 grid grid-cols-2 gap-2">
        <Dato etiqueta="Turno">{orden.turno}</Dato>
        <Dato etiqueta="Valor">{formatoMoneda(orden.valor)}</Dato>
        <Dato etiqueta="Servicio" ancho>
          {servicio ? `${servicio.numero} · ${servicio.nombre}` : '—'}
        </Dato>
        <Dato etiqueta="Colaborador">{colaborador ? `${colaborador.codigo} · ${colaborador.nombre}` : '—'}</Dato>
        <Dato etiqueta="Medio de pago">{etiquetaMedioPago(orden.medioPago)}</Dato>
        <Dato etiqueta="Fecha">{formatoFecha(orden.fecha)}</Dato>
        <Dato etiqueta="Registrada">{formatoFechaHora(orden.creadaEn)}</Dato>
        {orden.autorizaMotor ? <Dato etiqueta="Lavado de motor">Autorizado por el cliente</Dato> : null}
        {orden.observaciones ? (
          <Dato etiqueta="Observaciones" ancho>
            {orden.observaciones}
          </Dato>
        ) : null}
        {orden.motivo ? (
          <Dato etiqueta="Motivo de la anulación" ancho>
            {orden.motivo}
          </Dato>
        ) : null}
      </dl>
    </PanelLateral>
  );
}
