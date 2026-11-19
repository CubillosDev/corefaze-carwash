import { formatoMoneda } from '@/utils/formatoMoneda';
import { plural } from '@/utils/plural';

/**
 * "Operadores" del diseño, con los colaboradores del dominio: servicios e
 * ingresos de cada uno en el periodo, del que más vendió al que menos.
 *
 * @param {object} props
 * @param {{ colaboradorId: number, codigo: number, nombre: string, servicios: number, ingresos: number }[]} props.colaboradores
 */
export function RendimientoColaboradores({ colaboradores }) {
  return (
    <section aria-labelledby="titulo-rendimiento" className="rounded-tarjeta border border-neutro-200 bg-white px-4.5 py-4">
      <h2 id="titulo-rendimiento" className="text-titulo-tarjeta">
        Colaboradores
      </h2>
      {colaboradores.length === 0 ? (
        <p className="mt-3.5 text-detalle text-neutro-450">Sin servicios en este periodo.</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {colaboradores.map((colaborador) => (
            <li
              key={colaborador.colaboradorId}
              className="flex h-11 items-center gap-2.5 border-b border-neutro-100 text-control last:border-b-0"
            >
              <span className="inline-flex size-6.5 shrink-0 items-center justify-center rounded-full bg-neutro-150 text-avatar text-neutro-700">
                {colaborador.codigo}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{colaborador.nombre}</span>
              <span className="text-meta whitespace-nowrap text-neutro-600">
                {plural(colaborador.servicios, 'servicio', 'servicios')}
              </span>
              <span className="min-w-17.5 text-right font-semibold tabular-nums">{formatoMoneda(colaborador.ingresos)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
