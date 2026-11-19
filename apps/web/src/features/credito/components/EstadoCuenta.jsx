import { fechaEnBogota, formatoFecha } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';

/**
 * Estado de cuenta imprimible de una empresa ("Exportar" del diseño): sus
 * servicios a crédito sin pagar y el saldo que calcula el servidor. Solo se
 * ve al imprimir.
 *
 * @param {object} props
 * @param {object} props.empresa
 * @param {object[]} props.pendientes
 */
export function EstadoCuenta({ empresa, pendientes }) {
  return (
    <div data-impresion className="hidden w-full p-6 text-control text-neutro-900 print:block">
      <p className="text-titulo">Estado de cuenta</p>
      <p className="mt-1 text-cuerpo">
        {empresa.nombre} · NIT {empresa.documento}
      </p>
      <p className="text-detalle text-neutro-600">Corte al {formatoFecha(fechaEnBogota())}</p>
      <table className="mt-4 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-neutro-300 text-encabezado-tabla uppercase">
            <th className="py-1.5">Fecha</th>
            <th className="py-1.5">Vale</th>
            <th className="py-1.5">Placa</th>
            <th className="py-1.5">Servicio</th>
            <th className="py-1.5 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {pendientes.map((orden) => (
            <tr key={orden.id} className="border-b border-neutro-150">
              <td className="py-1.5">{formatoFecha(orden.fecha)}</td>
              <td className="py-1.5 font-mono">{orden.vale?.numero ?? '—'}</td>
              <td className="py-1.5 font-mono">{formatoPlaca(orden.vehiculo?.placa)}</td>
              <td className="py-1.5">{orden.servicio?.nombre}</td>
              <td className="py-1.5 text-right tabular-nums">{formatoMoneda(orden.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-right text-total">Saldo pendiente {formatoMoneda(empresa.saldoPendiente)}</p>
    </div>
  );
}
