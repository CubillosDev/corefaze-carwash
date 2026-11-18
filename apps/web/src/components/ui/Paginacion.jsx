import { IconoFlechaDerecha } from '@/components/ui/iconos/IconoFlechaDerecha';
import { IconoFlechaIzquierda } from '@/components/ui/iconos/IconoFlechaIzquierda';
import { rangoDePaginas } from '@/utils/paginar';

const ESTILOS_BOTON =
  'inline-flex h-7.5 min-w-7.5 items-center justify-center rounded-opcion border px-1.5 text-detalle font-semibold tabular-nums transition-colors duration-150';

const ESTILOS_FLECHA = `${ESTILOS_BOTON} border-neutro-275 bg-white text-neutro-700 disabled:cursor-not-allowed disabled:opacity-40`;

const numero = new Intl.NumberFormat('es-CO');

/**
 * Pie de tabla con el rango visible y los botones de página, como en el
 * listado de clientes del diseño.
 *
 * @param {object} props
 * @param {number} props.pagina Índice de la página actual, desde 0.
 * @param {number} props.totalPaginas
 * @param {number} props.totalElementos
 * @param {number} props.porPagina
 * @param {(pagina: number) => void} props.alCambiar
 */
export function Paginacion({ pagina, totalPaginas, totalElementos, porPagina, alCambiar }) {
  const desde = pagina * porPagina + 1;
  const hasta = Math.min(totalElementos, (pagina + 1) * porPagina);
  const rango =
    totalElementos === 0
      ? '0 resultados'
      : `${numero.format(desde)}–${numero.format(hasta)} de ${numero.format(totalElementos)}`;

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-neutro-150 bg-neutro-25 px-4 py-2.5"
    >
      <span className="text-detalle text-neutro-600 tabular-nums">{rango}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Página anterior"
          disabled={pagina === 0}
          onClick={() => alCambiar(pagina - 1)}
          className={ESTILOS_FLECHA}
        >
          <IconoFlechaIzquierda className="size-3.5" />
        </button>
        {rangoDePaginas(pagina, totalPaginas).map((valor, indice) =>
          valor === null ? (
            <span
              key={`hueco-${indice}`}
              aria-hidden="true"
              className={`${ESTILOS_BOTON} border-transparent text-neutro-450`}
            >
              …
            </span>
          ) : (
            <button
              key={valor}
              type="button"
              aria-label={`Página ${valor + 1}`}
              aria-current={valor === pagina ? 'page' : undefined}
              onClick={() => alCambiar(valor)}
              className={`${ESTILOS_BOTON} ${
                valor === pagina
                  ? 'border-neutro-900 bg-neutro-900 text-white'
                  : 'border-neutro-275 bg-white text-neutro-700 hover:border-neutro-300'
              }`}
            >
              {valor + 1}
            </button>
          ),
        )}
        <button
          type="button"
          aria-label="Página siguiente"
          disabled={pagina >= totalPaginas - 1}
          onClick={() => alCambiar(pagina + 1)}
          className={ESTILOS_FLECHA}
        >
          <IconoFlechaDerecha className="size-3.5" />
        </button>
      </div>
    </nav>
  );
}
