import { useId } from 'react';

import { Tarjeta } from '@/components/ui/Tarjeta';
import { etiquetaDeHora, variacionALaHora } from '@/utils/curvaAcumulada';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { mayusculaInicial } from '@/utils/mayusculaInicial';

/** Lienzo del diseño: la curva se dibuja en 600 × 160 y se estira al ancho de la tarjeta. */
const ANCHO = 600;
const ALTO = 160;
const LINEAS_GUIA = [40, 80, 120];

const trazo = (puntos) => `M${puntos.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')}`;

function Variacion({ curva, etiquetaAnterior }) {
  const cambio = variacionALaHora(curva);
  if (cambio === null) {
    return null;
  }
  return (
    <span className={`text-meta font-medium tabular-nums ${cambio >= 0 ? 'text-neutro-600' : 'text-error'}`}>
      {`${cambio > 0 ? '+' : ''}${cambio} % vs. ${etiquetaAnterior}`}
    </span>
  );
}

/**
 * Tarjeta "Ingresos acumulados" del diseño: la curva de la jornada hasta la
 * hora actual contra la curva completa de la jornada anterior (punteada), con
 * la variación frente a lo que la anterior llevaba a esta misma hora. Las
 * cifras las agrega el servidor.
 *
 * @param {object} props
 * @param {ReturnType<typeof import('@/utils/curvaAcumulada').curvaAcumulada>|null} props.curva
 *   Null si no hay jornada abierta o si no se pudo cargar.
 * @param {string} props.etiquetaAnterior "ayer" o la fecha corta de la jornada anterior.
 * @param {string} [props.aviso] Texto en lugar de la curva cuando no la hay.
 */
export function IngresosAcumulados({ curva, etiquetaAnterior, aviso }) {
  const idDegradado = useId();

  if (!curva) {
    return (
      <Tarjeta como="section" aria-labelledby="titulo-ingresos" className="flex flex-[2_1_460px] flex-col">
        <h2 id="titulo-ingresos" className="text-titulo-tarjeta">
          Ingresos acumulados
        </h2>
        <p className="mt-1 text-indicador tabular-nums">{formatoMoneda(0)}</p>
        <p className="m-auto py-4 text-center text-detalle text-neutro-450">{aviso}</p>
      </Tarjeta>
    );
  }

  const ultimo = curva.horas.length - 1;
  const x = (indice) => (indice / ultimo) * ANCHO;
  const tope = Math.max(1, curva.total, curva.totalAnterior ?? 0) * 1.08;
  const y = (valor) => ALTO - (valor / tope) * ALTO;

  const puntosHoy = curva.hoy.flatMap((valor, indice) => (valor === null ? [] : [[x(indice), y(valor)]]));
  const lineaHoy = puntosHoy.length ? trazo(puntosHoy) : '';
  const [puntoX, puntoY] = puntosHoy.at(-1) ?? [0, ALTO];
  const area = puntosHoy.length ? `${lineaHoy} L${puntoX.toFixed(1)} ${ALTO} L0 ${ALTO} Z` : '';
  const lineaAnterior = curva.anterior ? trazo(curva.anterior.map((valor, indice) => [x(indice), y(valor)])) : '';

  const marcas = curva.horas.flatMap((hora, indice) => (indice % 2 === 0 && indice < ultimo ? [{ hora, indice }] : []));
  const primeraDeLaTarde = marcas.find((marca) => marca.hora >= 12);
  const resumen = curva.anterior
    ? `${formatoMoneda(curva.total)} hasta ahora; ${etiquetaAnterior} a esta hora iba en ${formatoMoneda(curva.anteriorALaHora)}`
    : `${formatoMoneda(curva.total)} hasta ahora`;

  return (
    <Tarjeta como="section" aria-labelledby="titulo-ingresos" className="flex flex-[2_1_460px] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="titulo-ingresos" className="text-titulo-tarjeta">
            Ingresos acumulados
          </h2>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="text-indicador tabular-nums">{formatoMoneda(curva.total)}</span>
            <Variacion curva={curva} etiquetaAnterior={etiquetaAnterior} />
          </p>
        </div>
        <ul className="flex items-center gap-3.5 text-meta text-neutro-600" aria-label="Convenciones">
          <li className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden="true" className="h-0.75 w-3.5 rounded-xs bg-primario" />
            Hoy
          </li>
          {curva.anterior ? (
            <li className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span aria-hidden="true" className="w-3.5 border-t-2 border-dashed border-neutro-375" />
              {`${mayusculaInicial(etiquetaAnterior)} · ${formatoMoneda(curva.totalAnterior)}`}
            </li>
          ) : null}
        </ul>
      </div>

      <div className="relative mt-2.5 min-h-20 flex-1">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Ingresos acumulados: ${resumen}`}
          className="absolute inset-0 size-full overflow-visible text-primario"
        >
          <defs>
            <linearGradient id={idDegradado} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.07" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          {LINEAS_GUIA.map((altura) => (
            <line key={altura} x1="0" y1={altura} x2={ANCHO} y2={altura} className="stroke-neutro-150" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" y1={ALTO} x2={ANCHO} y2={ALTO} className="stroke-neutro-200" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {lineaAnterior ? (
            <path d={lineaAnterior} fill="none" className="stroke-neutro-375" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
          ) : null}
          {area ? <path d={area} fill={`url(#${idDegradado})`} /> : null}
          {lineaHoy ? (
            <path
              d={lineaHoy}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
        <span
          aria-hidden="true"
          className="absolute -mt-1.25 -ml-1.25 size-2.5 rounded-full border-2 border-primario bg-white"
          style={{ left: `${(puntoX / ANCHO) * 100}%`, top: `${(puntoY / ALTO) * 100}%` }}
        />
      </div>

      <div aria-hidden="true" className="relative mt-2 h-3.5 text-micro text-neutro-450">
        {marcas.map((marca, posicion) => (
          <span
            key={marca.hora}
            className={`absolute whitespace-nowrap ${posicion === 0 ? '' : '-translate-x-1/2'}`}
            style={{ left: `${(x(marca.indice) / ANCHO) * 100}%` }}
          >
            {etiquetaDeHora(marca.hora, posicion === 0 || marca === primeraDeLaTarde || posicion === marcas.length - 1)}
          </span>
        ))}
      </div>
    </Tarjeta>
  );
}
