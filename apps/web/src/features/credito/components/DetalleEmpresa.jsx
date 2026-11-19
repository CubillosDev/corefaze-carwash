import { Boton } from '@/components/ui/Boton';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoTelefono } from '@/utils/formatoTelefono';

/**
 * Encabezado de la empresa elegida (diseño: nombre, NIT, contacto y corte)
 * con sus indicadores. El saldo viene del servidor.
 *
 * @param {object} props
 * @param {import('@/features/credito/api/credito.api').EmpresaCredito} props.empresa
 * @param {object[]} props.pendientes Servicios a crédito sin pagar.
 * @param {boolean} props.puedeGestionar Ve "Condiciones".
 * @param {() => void} props.alEditarCondiciones
 * @param {() => void} props.alImprimir
 */
export function DetalleEmpresa({ empresa, pendientes, puedeGestionar, alEditarCondiciones, alImprimir }) {
  const verificados = pendientes.filter((orden) => orden.vale?.verificadoEn).length;
  const datos = [
    `NIT ${empresa.documento}`,
    empresa.contacto,
    formatoTelefono(empresa.telefono),
    empresa.diaCorte ? `Corte el día ${empresa.diaCorte} de cada mes` : 'Sin día de corte',
  ].filter(Boolean);

  const indicadores = [
    { etiqueta: 'Saldo pendiente', valor: formatoMoneda(empresa.saldoPendiente) },
    { etiqueta: 'Servicios sin pagar', valor: String(pendientes.length) },
    { etiqueta: 'Vales verificados', valor: `${verificados} de ${pendientes.length}` },
    {
      etiqueta: 'Cupo disponible',
      valor: empresa.cupoCredito
        ? formatoMoneda(Math.max(0, empresa.cupoCredito - empresa.saldoPendiente))
        : 'Sin cupo',
    },
  ];

  return (
    <section aria-labelledby="titulo-empresa" className="rounded-tarjeta border border-neutro-200 bg-white px-4.5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3.5">
        <div className="min-w-0">
          <h2 id="titulo-empresa" className="text-titulo-cajon">
            {empresa.nombre}
          </h2>
          <p className="mt-0.5 text-detalle text-neutro-600">{datos.join(' · ')}</p>
        </div>
        <div className="flex gap-2">
          {puedeGestionar ? (
            <Boton variante="secundario" onClick={alEditarCondiciones}>
              Condiciones
            </Boton>
          ) : null}
          <Boton variante="secundario" onClick={alImprimir}>
            Estado de cuenta
          </Boton>
        </div>
      </div>
      <dl className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(min(140px,100%),1fr))] gap-2">
        {indicadores.map((indicador) => (
          <div key={indicador.etiqueta} className="rounded-bloque bg-neutro-75 px-3 py-2.5">
            <dt className="text-nota text-neutro-600">{indicador.etiqueta}</dt>
            <dd className="mt-0.5 text-titulo-cajon whitespace-nowrap tabular-nums">{indicador.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
