import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPorcentaje } from '@/utils/formatoPorcentaje';

/** Colores de las cuatro series del diseño; el resto de servicios se agrupa en gris. */
const TONOS = ['bg-primario', 'bg-primario-800', 'bg-grafico-cian', 'bg-grafico-violeta'];

/**
 * "Mix de servicios" del diseño: qué parte de los ingresos dejó cada
 * servicio del catálogo (los cuatro primeros y "Otros").
 *
 * @param {object} props
 * @param {{ servicioId: number, nombre: string, servicios: number, ingresos: number }[]} props.servicios
 */
export function MixServicios({ servicios }) {
  const total = servicios.reduce((suma, servicio) => suma + servicio.ingresos, 0);
  const principales = servicios.slice(0, TONOS.length);
  const resto = servicios.slice(TONOS.length);
  const filas = [
    ...principales.map((servicio, indice) => ({ ...servicio, tono: TONOS[indice] })),
    ...(resto.length
      ? [
          {
            servicioId: 'otros',
            nombre: `Otros (${resto.length})`,
            ingresos: resto.reduce((suma, servicio) => suma + servicio.ingresos, 0),
            tono: 'bg-neutro-375',
          },
        ]
      : []),
  ];

  return (
    <section aria-labelledby="titulo-mix" className="rounded-tarjeta border border-neutro-200 bg-white px-4.5 py-4">
      <h2 id="titulo-mix" className="text-titulo-tarjeta">
        Mix de servicios
      </h2>
      {filas.length === 0 ? (
        <p className="mt-3.5 text-detalle text-neutro-450">Sin servicios en este periodo.</p>
      ) : (
        <ul className="mt-3.5 flex flex-col gap-3">
          {filas.map((fila) => {
            const parte = total ? Math.round((fila.ingresos / total) * 100) / 100 : 0;
            return (
              <li key={fila.servicioId}>
                <div className="flex justify-between gap-2 text-detalle">
                  <span className="truncate">{fila.nombre}</span>
                  <span className="font-semibold whitespace-nowrap" title={formatoMoneda(fila.ingresos)}>
                    {formatoPorcentaje(parte)}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutro-150" aria-hidden="true">
                  <div className={`h-full rounded-full ${fila.tono}`} style={{ width: `${parte * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
