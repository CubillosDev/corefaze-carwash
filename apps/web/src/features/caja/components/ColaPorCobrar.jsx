import { ControlSegmentado } from '@/components/ui/ControlSegmentado';
import { InsigniaEstadoOrden } from '@/features/ordenes-lavado';
import { etiquetaTipoVehiculo } from '@/constants/etiquetas';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';

const vehiculoDe = (orden) => orden.vehiculo?.marca || etiquetaTipoVehiculo(orden.vehiculo?.tipoVehiculo);

function FilaOrden({ orden, elegida, alElegir }) {
  const contenido = (
    <>
      <span
        aria-hidden="true"
        className={`inline-flex size-4 items-center justify-center rounded-full border-[1.5px] ${
          elegida ? 'border-primario' : 'border-neutro-325'
        }`}
      >
        <span className={`size-2 rounded-full ${elegida ? 'bg-primario' : 'bg-transparent'}`} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-cuerpo font-semibold">
          <span className="font-mono text-detalle tracking-placa">{formatoPlaca(orden.vehiculo?.placa)}</span> ·{' '}
          {vehiculoDe(orden)}
        </span>
        <span className="block truncate text-meta text-neutro-550">
          {orden.servicio?.nombre} · {orden.colaborador?.codigo}
        </span>
      </span>
      <span className="text-titulo-tarjeta text-right tabular-nums">{formatoMoneda(orden.valor)}</span>
    </>
  );

  if (!alElegir) {
    return (
      <li className="grid h-14.5 grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-3 border-t border-neutro-100 px-4">
        {contenido}
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        aria-pressed={elegida}
        onClick={() => alElegir(orden)}
        className={`grid h-14.5 w-full grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-3 border-t border-neutro-100 px-4 text-left transition-colors duration-150 hover:bg-neutro-75 ${
          elegida ? 'bg-primario-25' : ''
        }`}
      >
        {contenido}
      </button>
    </li>
  );
}

/**
 * "Por cobrar" del diseño: las órdenes terminadas (Listos), que se eligen
 * para cobrar, y las que siguen en el patio, solo para anticipar. Una orden
 * en el patio no se cobra: primero se termina en el tablero (sin saltos de
 * estado).
 *
 * @param {object} props
 * @param {object[]} props.listos
 * @param {object[]} props.enPatio
 * @param {'listos'|'patio'} props.pestana
 * @param {(pestana: string) => void} props.alCambiarPestana
 * @param {number|null} props.elegidaId
 * @param {(orden: object) => void} props.alElegir
 */
export function ColaPorCobrar({ listos, enPatio, pestana, alCambiarPestana, elegidaId, alElegir }) {
  const ordenes = pestana === 'listos' ? listos : enPatio;

  return (
    <section aria-labelledby="titulo-por-cobrar" className="overflow-hidden rounded-tarjeta border border-neutro-200 bg-white">
      <header className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5">
        <h2 id="titulo-por-cobrar" className="text-titulo-tarjeta">
          Por cobrar
        </h2>
        <ControlSegmentado
          etiqueta="Órdenes por cobrar"
          tamano="compacto"
          valor={pestana}
          alCambiar={alCambiarPestana}
          opciones={[
            { valor: 'listos', texto: `Listos ${listos.length}` },
            { valor: 'patio', texto: `En patio ${enPatio.length}` },
          ]}
        />
      </header>

      {ordenes.length === 0 ? (
        <p className="border-t border-neutro-100 px-4 py-6.5 text-center text-detalle text-neutro-450">
          {pestana === 'listos' ? 'No hay vehículos terminados por cobrar' : 'No hay vehículos en el patio'}
        </p>
      ) : (
        <ul>
          {ordenes.map((orden) =>
            pestana === 'listos' ? (
              <FilaOrden key={orden.id} orden={orden} elegida={orden.id === elegidaId} alElegir={alElegir} />
            ) : (
              <FilaOrden key={orden.id} orden={orden} elegida={false} />
            ),
          )}
        </ul>
      )}

      {pestana === 'patio' && enPatio.length > 0 ? (
        <p className="flex items-center gap-2 border-t border-neutro-100 bg-neutro-25 px-4 py-2.5 text-meta text-neutro-600">
          <InsigniaEstadoOrden estado="terminada" />
          Para cobrarla, primero termina la orden en el tablero.
        </p>
      ) : null}
    </section>
  );
}
