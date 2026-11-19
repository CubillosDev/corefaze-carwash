import { formatoMoneda } from '@/utils/formatoMoneda';
import { plural } from '@/utils/plural';

/**
 * Franja de indicadores de la caja del diseño: cobrado, efectivo en caja y
 * por cobrar. Todas las cifras vienen del servidor.
 *
 * @param {object} props
 * @param {import('@/features/caja/api/caja.api').TotalesCaja} props.totales
 * @param {number} props.baseInicial
 */
export function IndicadoresCaja({ totales, baseInicial }) {
  const indicadores = [
    {
      etiqueta: 'Cobrado hoy',
      valor: formatoMoneda(totales.cobrado),
      apoyo: `${plural(totales.cobros, 'cobro', 'cobros')} · ticket ${formatoMoneda(totales.ticketPromedio)}`,
    },
    {
      etiqueta: 'Efectivo en caja',
      valor: formatoMoneda(totales.efectivoEsperado),
      apoyo: `Base ${formatoMoneda(baseInicial)} · egresos ${formatoMoneda(totales.egresos)}`,
    },
    {
      etiqueta: 'Por cobrar',
      valor: formatoMoneda(totales.porCobrar),
      apoyo: `${plural(totales.vehiculosPorCobrar, 'vehículo terminado', 'vehículos terminados')}`,
    },
  ];

  return (
    <dl className="mt-4 grid grid-cols-1 rounded-tarjeta border border-neutro-200 bg-white escritorio:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
      {indicadores.map((indicador, indice) => (
        <div
          key={indicador.etiqueta}
          className={`min-w-0 px-4.5 py-3.5 ${indice > 0 ? 'border-neutro-150 max-escritorio:border-t escritorio:border-l' : ''}`}
        >
          <dt className="text-meta text-neutro-600">{indicador.etiqueta}</dt>
          <dd className="mt-0.75 text-indicador whitespace-nowrap tabular-nums">{indicador.valor}</dd>
          <dd className="mt-px text-nota text-neutro-450">{indicador.apoyo}</dd>
        </div>
      ))}
    </dl>
  );
}
