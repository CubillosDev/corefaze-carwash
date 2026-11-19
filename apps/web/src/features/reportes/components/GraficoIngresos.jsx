import { diaCortoDeLaSemana } from '@/utils/aritmeticaFechas';
import { formatoFecha } from '@/utils/formatoFecha';
import { formatoMoneda, formatoMonedaCorta } from '@/utils/formatoMoneda';

/** Con más días que esto, no caben los valores sobre las barras. */
const MAXIMO_CON_VALORES = 10;

/**
 * Barras de ingresos por día del diseño: la del mejor día en azul y las demás
 * en azul claro, con el valor encima (si caben) y el día debajo.
 *
 * @param {object} props
 * @param {{ fecha: string, servicios: number, ingresos: number }[]} props.dias
 */
export function GraficoIngresos({ dias }) {
  const maximo = Math.max(1, ...dias.map((dia) => dia.ingresos));
  const conValores = dias.length <= MAXIMO_CON_VALORES;
  const separacion = dias.length > MAXIMO_CON_VALORES ? 'gap-1' : 'gap-3';

  return (
    <section aria-labelledby="titulo-ingresos" className="mt-3 rounded-tarjeta border border-neutro-200 bg-white px-4.5 py-4">
      <h2 id="titulo-ingresos" className="text-titulo-tarjeta">
        Ingresos
      </h2>
      <ul className={`mt-4 flex h-47.5 items-end border-b border-neutro-150 pb-0.5 ${separacion}`} aria-label="Ingresos por día">
        {dias.map((dia) => {
          const mejor = dia.ingresos === maximo && dia.ingresos > 0;
          return (
            <li
              key={dia.fecha}
              title={`${formatoFecha(dia.fecha)} · ${formatoMoneda(dia.ingresos)} · ${dia.servicios} servicios`}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
            >
              <span className="sr-only">
                {formatoFecha(dia.fecha)}: {formatoMoneda(dia.ingresos)}
              </span>
              {conValores ? (
                <span aria-hidden="true" className="text-micro font-medium whitespace-nowrap text-neutro-600">
                  {formatoMonedaCorta(dia.ingresos)}
                </span>
              ) : null}
              <span
                aria-hidden="true"
                className={`block w-full max-w-11.5 rounded-t-[7px] rounded-b-[3px] transition-[height] duration-500 ease-suave ${
                  mejor ? 'bg-primario' : dia.ingresos > 0 ? 'bg-primario-200' : 'bg-neutro-150'
                }`}
                style={{ height: `${Math.max(dia.ingresos > 0 ? 3 : 1, (dia.ingresos / maximo) * 100)}%` }}
              />
            </li>
          );
        })}
      </ul>
      <div aria-hidden="true" className={`mt-2 flex ${separacion}`}>
        {dias.map((dia) => (
          <span key={dia.fecha} className="min-w-0 flex-1 truncate text-center text-nota text-neutro-450">
            {dias.length > MAXIMO_CON_VALORES ? Number(dia.fecha.slice(8)) : diaCortoDeLaSemana(dia.fecha)}
          </span>
        ))}
      </div>
    </section>
  );
}
