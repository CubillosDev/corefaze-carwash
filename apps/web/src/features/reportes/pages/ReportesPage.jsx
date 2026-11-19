import { useCallback, useState } from 'react';

import { ControlSegmentado } from '@/components/ui/ControlSegmentado';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { obtenerResumen } from '@/features/reportes/api/reportes.api';
import { GraficoIngresos } from '@/features/reportes/components/GraficoIngresos';
import { MixServicios } from '@/features/reportes/components/MixServicios';
import { RendimientoColaboradores } from '@/features/reportes/components/RendimientoColaboradores';
import { useCarga } from '@/hooks/useCarga';
import { primerDiaDelMes, sumarDias } from '@/utils/aritmeticaFechas';
import { fechaEnBogota, formatoFecha } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';

const PERIODOS = [
  { valor: 'semana', texto: 'Semana' },
  { valor: 'mes', texto: 'Mes' },
];

/** Semana: los últimos 7 días con hoy. Mes: del día 1 a hoy. */
function rangoDe(periodo) {
  const hoy = fechaEnBogota();
  return periodo === 'semana' ? { desde: sumarDias(hoy, -6), hasta: hoy } : { desde: primerDiaDelMes(hoy), hasta: hoy };
}

function Variacion({ actual, anterior }) {
  if (!anterior) {
    return <span className="text-neutro-450">Sin datos del periodo anterior</span>;
  }
  const cambio = Math.round(((actual - anterior) / anterior) * 100);
  const tono = cambio > 0 ? 'text-exito-solido' : cambio < 0 ? 'text-advertencia-fuerte' : 'text-neutro-600';
  return <span className={`font-medium ${tono}`}>{`${cambio > 0 ? '+' : ''}${cambio} % frente al periodo anterior`}</span>;
}

/**
 * Reportes del diseño: indicadores con su variación, ingresos por día, mix
 * de servicios y desempeño por colaborador, por semana o por mes. Las cifras
 * las agrega el servidor (sin órdenes anuladas).
 */
export function ReportesPage() {
  const [periodo, setPeriodo] = useState('semana');
  const cargar = useCallback((signal) => obtenerResumen(rangoDe(periodo), { signal }), [periodo]);
  const carga = useCarga(cargar);
  const reporte = carga.datos;

  const indicadores = reporte
    ? [
        { etiqueta: 'Ingresos', valor: formatoMoneda(reporte.totales.ingresos), actual: reporte.totales.ingresos, anterior: reporte.anterior.ingresos },
        { etiqueta: 'Servicios', valor: String(reporte.totales.servicios), actual: reporte.totales.servicios, anterior: reporte.anterior.servicios },
        {
          etiqueta: 'Ticket promedio',
          valor: formatoMoneda(reporte.totales.ticketPromedio),
          actual: reporte.totales.ticketPromedio,
          anterior: reporte.anterior.ticketPromedio,
        },
      ]
    : [];

  return (
    <div className="flex flex-col pb-15">
      <EncabezadoPagina
        titulo="Reportes"
        descripcion={
          reporte
            ? `Rendimiento del lavadero · del ${formatoFecha(reporte.periodo.desde)} al ${formatoFecha(reporte.periodo.hasta)}`
            : 'Rendimiento del lavadero'
        }
        acciones={<ControlSegmentado etiqueta="Periodo" opciones={PERIODOS} valor={periodo} alCambiar={setPeriodo} />}
      />

      {carga.situacion === 'cargando' ? <EstadoCarga texto="Calculando el reporte…" className="mt-6" /> : null}
      {carga.situacion === 'error' ? (
        <EstadoError mensaje={carga.error} alReintentar={carga.recargar} className="mt-4.5" />
      ) : null}

      {carga.situacion === 'listo' ? (
        <>
          <dl className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3">
            {indicadores.map((indicador) => (
              <div key={indicador.etiqueta} className="rounded-tarjeta border border-neutro-200 bg-white px-4 py-3.75">
                <dt className="text-meta text-neutro-600">{indicador.etiqueta}</dt>
                <dd className="mt-1.5 text-indicador tabular-nums">{indicador.valor}</dd>
                <dd className="mt-0.5 text-nota">
                  <Variacion actual={indicador.actual} anterior={indicador.anterior} />
                </dd>
              </div>
            ))}
          </dl>

          <GraficoIngresos dias={reporte.porDia} />

          <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-3">
            <MixServicios servicios={reporte.servicios} />
            <RendimientoColaboradores colaboradores={reporte.colaboradores} />
          </div>
        </>
      ) : null}
    </div>
  );
}
