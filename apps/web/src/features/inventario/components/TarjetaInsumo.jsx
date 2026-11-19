import { IconoMas } from '@/components/ui/iconos/IconoMas';

/** La barra se llena con 2,5 veces el mínimo, como en el diseño. */
const FACTOR_BARRA = 2.5;

const claseBoton =
  'inline-flex size-7 items-center justify-center rounded-opcion border border-neutro-275 bg-white text-neutro-700 transition-[background-color,transform] duration-150 hover:not-disabled:bg-neutro-100 active:not-disabled:scale-92 disabled:opacity-40';

/**
 * Tarjeta de un insumo del diseño: nombre, categoría, stock con su unidad,
 * barra (ámbar si está bajo el mínimo) y los botones − y +. El nombre abre
 * el detalle.
 *
 * @param {object} props
 * @param {import('@/features/inventario/api/inventario.api').Insumo} props.insumo
 * @param {boolean} props.puedeMover
 * @param {boolean} props.moviendo
 * @param {(cantidad: number) => void} props.alMover
 * @param {() => void} props.alAbrir
 */
export function TarjetaInsumo({ insumo, puedeMover, moviendo, alMover, alAbrir }) {
  const ancho = insumo.stockMinimo ? Math.min(100, (insumo.stock / (insumo.stockMinimo * FACTOR_BARRA)) * 100) : 100;
  const inactivo = insumo.estado !== 'activo';

  return (
    <article className={`rounded-tarjeta border border-neutro-200 bg-white px-4 py-3.75 ${inactivo ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-cuerpo font-semibold">
            <button type="button" onClick={alAbrir} className="text-left hover:text-primario">
              {insumo.nombre}
            </button>
          </h2>
          <p className="mt-px text-meta text-neutro-450">{insumo.categoria}</p>
        </div>
        {insumo.stockBajo && !inactivo ? (
          <span className="rounded-full bg-advertencia-suave px-2 py-0.5 text-etiqueta-menu tracking-normal whitespace-nowrap text-advertencia">
            Stock bajo
          </span>
        ) : null}
        {inactivo ? (
          <span className="rounded-full bg-neutro-100 px-2 py-0.5 text-etiqueta-menu tracking-normal text-neutro-650">Inactivo</span>
        ) : null}
      </div>
      <p className="mt-3.5 flex items-baseline gap-1.25">
        <span className="text-indicador tabular-nums">{insumo.stock}</span>
        <span className="text-meta text-neutro-600">{insumo.unidad}</span>
      </p>
      <div className="mt-2 h-1.25 overflow-hidden rounded-full bg-neutro-150" aria-hidden="true">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-300 ${
            insumo.stockBajo ? 'bg-advertencia-solido' : 'bg-primario'
          }`}
          style={{ width: `${ancho}%` }}
        />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-nota text-neutro-450">Mínimo {insumo.stockMinimo}</span>
        {puedeMover && !inactivo ? (
          <div className="flex gap-1">
            <button
              type="button"
              aria-label={`Restar 1 a ${insumo.nombre}`}
              disabled={moviendo || insumo.stock === 0}
              onClick={() => alMover(-1)}
              className={claseBoton}
            >
              <span aria-hidden="true" className="block h-0.5 w-3 rounded-full bg-current" />
            </button>
            <button
              type="button"
              aria-label={`Sumar 1 a ${insumo.nombre}`}
              disabled={moviendo}
              onClick={() => alMover(1)}
              className={claseBoton}
            >
              <IconoMas className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
