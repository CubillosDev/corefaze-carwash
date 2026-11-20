import { useState } from 'react';
import { Link } from 'react-router';

import { Avatar } from '@/components/ui/Avatar';
import { Placa } from '@/components/ui/Placa';
import { Punto } from '@/components/ui/Punto';
import { etiquetaTipoVehiculo, tonoEstadoOrden } from '@/constants/etiquetas';
import { RUTAS } from '@/constants/rutas';
import { MenuMoverOrden } from '@/features/ordenes-lavado/components/MenuMoverOrden';
import { avanceDeFase } from '@/utils/estadosOrden';
import { formatoPlaca } from '@/utils/formatoPlaca';

const RELLENO_POR_TONO = {
  primario: 'bg-primario',
  advertencia: 'bg-advertencia-solido',
  exito: 'bg-exito-solido',
  error: 'bg-error',
  neutro: 'bg-neutro-500',
};

/**
 * Tarjeta de una orden en el tablero: placa, vehículo, servicio, colaborador y
 * turno. Toda la tarjeta abre el detalle; el botón "⋯" cambia el estado y,
 * en escritorio, también se puede arrastrar a otra fase.
 *
 * @param {object} props
 * @param {import('@/features/ordenes-lavado/api/ordenesLavado.api').OrdenLavado} props.orden
 * @param {{ placa: string, marca: string|null, tipoVehiculo: string } | null} props.vehiculo
 * @param {{ nombre: string } | null} props.servicio
 * @param {{ codigo: number, nombre: string } | null} props.colaborador
 * @param {boolean} props.puedeAnular
 * @param {boolean} props.ocupada Mientras se guarda un cambio de esta orden.
 * @param {(estado: string) => void} props.alCambiarEstado
 * @param {boolean} [props.arrastrando] Se está arrastrando: queda su lugar marcado.
 * @param {boolean} [props.aterrizando] Acaba de llegar a esta fase.
 * @param {(evento: PointerEvent) => void} [props.alPresionar] Inicio de un posible arrastre.
 */
export function TarjetaOrden({
  orden,
  vehiculo,
  servicio,
  colaborador,
  puedeAnular,
  ocupada,
  alCambiarEstado,
  arrastrando = false,
  aterrizando = false,
  alPresionar,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const placa = vehiculo?.placa ?? '';
  const tono = tonoEstadoOrden(orden.estado);
  const avance = avanceDeFase(orden.estado);

  return (
    <article
      onPointerDown={alPresionar}
      className={`relative rounded-menu border border-neutro-200 bg-white px-3 pt-2.75 pb-3 shadow-tarjeta transition-[box-shadow,transform,opacity] duration-180 hover:-translate-y-px hover:shadow-tarjeta-hover ${
        menuAbierto ? 'z-30' : ''
      } ${ocupada ? 'opacity-60' : ''} ${arrastrando ? 'opacity-40' : ''} ${aterrizando ? 'animate-aterrizar' : ''}`}
    >
      <Link
        to={`${RUTAS.ORDENES_LAVADO}/${orden.id}`}
        aria-label={`Ver la orden de ${formatoPlaca(placa)}, turno ${orden.turno}`}
        draggable={false}
        className="absolute inset-0 rounded-menu escritorio:cursor-grab"
      />

      <div className="flex items-center gap-2">
        <Placa placa={placa} />
        <span className="flex-1" />
        <Punto tono={tono} />
        <MenuMoverOrden
          estado={orden.estado}
          descripcion={`la orden de ${formatoPlaca(placa)}`}
          puedeAnular={puedeAnular}
          deshabilitado={ocupada}
          alElegir={alCambiarEstado}
          alAbrirOCerrar={setMenuAbierto}
          enlaceCobro={`${RUTAS.CAJA}?orden=${orden.id}`}
        />
      </div>

      <p className="mt-2.25 truncate text-cuerpo font-semibold text-neutro-900">
        {vehiculo?.marca || etiquetaTipoVehiculo(vehiculo?.tipoVehiculo)}
      </p>
      <p className="mt-px truncate text-meta text-neutro-550">{servicio?.nombre ?? 'Servicio'}</p>

      <div className="mt-2.75 flex items-center gap-2">
        <span title={colaborador?.nombre}>
          <Avatar nombre={String(colaborador?.codigo ?? '—')} textoLiteral tamano="pequeno" tono="neutro" />
        </span>
        <span aria-hidden="true" className="h-1 flex-1 overflow-hidden rounded-full bg-neutro-225">
          <span
            className={`block h-full rounded-full transition-[width] duration-400 ease-suave ${RELLENO_POR_TONO[tono]}`}
            style={{ width: `${avance}%` }}
          />
        </span>
        <span className="text-micro whitespace-nowrap text-neutro-450">Turno {orden.turno}</span>
      </div>
    </article>
  );
}
