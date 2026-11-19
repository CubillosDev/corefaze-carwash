import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { IconoReportes } from '@/components/ui/iconos/IconoReportes';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { formatoMoneda } from '@/utils/formatoMoneda';

/**
 * Tarjeta "Ingresos acumulados". El total es el que calcula el servidor para
 * la jornada abierta. La curva por hora del diseño necesita datos que la API
 * todavía no entrega, así que en su lugar se muestra un estado vacío honesto.
 *
 * @param {{ total: number|null }} props
 */
export function IngresosAcumulados({ total }) {
  return (
    <Tarjeta
      como="section"
      aria-labelledby="titulo-ingresos"
      className="mt-3 flex min-h-55 flex-[2_1_460px] flex-col"
    >
      <h2 id="titulo-ingresos" className="text-titulo-tarjeta">
        Ingresos acumulados
      </h2>
      <p className="mt-1 text-indicador tabular-nums">{formatoMoneda(total ?? 0)}</p>
      <EstadoVacio
        icono={<IconoReportes className="size-5" />}
        titulo="Disponible próximamente"
        descripcion="La API todavía no entrega los ingresos por hora para dibujar la curva del día."
        className="flex-1 justify-center py-4"
      />
    </Tarjeta>
  );
}
