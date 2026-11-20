import { Contador } from '@/components/ui/Contador';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { Punto } from '@/components/ui/Punto';
import { etiquetaEstadoOrden, tonoEstadoOrden } from '@/constants/etiquetas';
import { TarjetaOrden } from '@/features/ordenes-lavado/components/TarjetaOrden';
import { useArrastreOrdenes } from '@/features/ordenes-lavado/hooks/useArrastreOrdenes';
import { accionAlSoltar, FASES_DEL_TABLERO, motivoMovimientoNoPermitido } from '@/utils/estadosOrden';
import { plural } from '@/utils/plural';

/**
 * Tablero en vivo: una columna por estado con sus tarjetas. Las órdenes
 * canceladas no tienen columna; se ven en la lista.
 *
 * El tablero ocupa el alto disponible y cada columna se desplaza por dentro,
 * con su encabezado siempre visible: con muchas órdenes la página no se
 * alarga. En pantallas angostas las columnas se desplazan en horizontal (80 %
 * del ancho cada una), como en el diseño.
 *
 * En escritorio las tarjetas se arrastran a la fase siguiente (o a Entregada,
 * que lleva a cobrar en caja): las columnas permitidas se marcan, las demás se
 * atenúan y la columna de destino muestra dónde aterriza la tarjeta.
 *
 * @param {object} props
 * @param {object[]} props.ordenes
 * @param {(orden: object) => object} props.datosDe Vehículo, servicio y colaborador de una orden.
 * @param {boolean} props.puedeAnular
 * @param {number|null} props.ordenOcupada
 * @param {(orden: object, estado: string) => (Promise<unknown>|void)} props.alCambiarEstado
 * @param {(orden: object) => void} props.alCobrar Lleva a cobrar la orden en caja.
 * @param {(mensaje: string) => void} props.alAvisar Explica por qué no se pudo soltar una tarjeta.
 */
export function TableroOrdenes({ ordenes, datosDe, puedeAnular, ordenOcupada, alCambiarEstado, alCobrar, alAvisar }) {
  const { arrastre, recienMovida, alPresionarTarjeta } = useArrastreOrdenes({
    alSoltar: (orden, destino, accion) => (accion === 'cobrar' ? alCobrar(orden) : alCambiarEstado(orden, destino)),
    alRechazar: (orden) => alAvisar(motivoMovimientoNoPermitido(orden.estado)),
  });

  return (
    <div className="relative -mr-3.5 mt-3.5 grid min-h-88 flex-1 snap-x snap-mandatory grid-cols-[repeat(4,80vw)] grid-rows-[minmax(0,1fr)] gap-2.5 overflow-x-auto pb-1 escritorio:mr-0 escritorio:grid-cols-[repeat(4,minmax(190px,1fr))]">
      {FASES_DEL_TABLERO.map((estado) => {
        const tarjetas = ordenes.filter((orden) => orden.estado === estado);
        const titulo = etiquetaEstadoOrden(estado);
        const permitida = arrastre !== null && accionAlSoltar(arrastre.origen, estado) !== null;
        const encima = permitida && arrastre.destino === estado;
        let resalte = '';
        if (arrastre && permitida) {
          resalte = `outline-2 -outline-offset-2 outline-dashed ${encima ? 'bg-primario-100 outline-primario/45' : 'outline-primario/25'}`;
        } else if (arrastre && estado !== arrastre.origen) {
          resalte = 'opacity-55';
        }

        return (
          <section
            key={estado}
            aria-label={titulo}
            data-columna={estado}
            className={`flex min-h-0 snap-start flex-col rounded-tarjeta bg-neutro-225 pt-2.5 transition-[background-color,outline-color,opacity] duration-200 ${resalte}`}
          >
            <header className="flex items-center gap-2 px-3.5 pt-0.5 pb-2">
              <Punto tono={tonoEstadoOrden(estado)} tamano="grande" />
              <h2 className="flex-1 truncate text-control font-semibold text-neutro-900">{titulo}</h2>
              <Contador etiqueta={plural(tarjetas.length, 'orden', 'órdenes')}>{tarjetas.length}</Contador>
            </header>

            <div data-desplazable className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pt-0.5 pb-2.5">
              {encima ? (
                <div
                  data-hueco
                  className="flex shrink-0 animate-aparecer items-center justify-center rounded-menu border-2 border-dashed border-primario/40 bg-white/70 text-meta font-semibold text-primario"
                  style={{ height: arrastre.alto }}
                >
                  {arrastre.accion === 'cobrar' ? 'Soltar para cobrar en caja' : 'Soltar aquí'}
                </div>
              ) : null}
              {tarjetas.map((orden) => (
                <TarjetaOrden
                  key={orden.id}
                  orden={orden}
                  {...datosDe(orden)}
                  puedeAnular={puedeAnular}
                  ocupada={ordenOcupada === orden.id}
                  arrastrando={arrastre?.ordenId === orden.id}
                  aterrizando={recienMovida === orden.id}
                  alPresionar={ordenOcupada === orden.id ? undefined : (evento) => alPresionarTarjeta(evento, orden)}
                  alCambiarEstado={(siguiente) => alCambiarEstado(orden, siguiente)}
                />
              ))}

              {tarjetas.length === 0 && !encima ? (
                <EstadoVacio variante="punteado" titulo="Sin vehículos" className="min-h-22.5 flex-1" />
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
