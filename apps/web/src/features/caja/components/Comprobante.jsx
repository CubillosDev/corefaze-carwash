import { MEDIOS_PAGO } from '@/constants/dominio';
import { etiquetaMedioPago, etiquetaTipoVehiculo } from '@/constants/etiquetas';
import { formatoFechaHora } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';
import { numeroComprobante } from '@/utils/numeroComprobante';

function Separador() {
  return <div aria-hidden="true" className="my-2.5 border-t border-dashed border-neutro-350" />;
}

function Linea({ etiqueta, children, mono = false }) {
  return (
    <div className="flex justify-between gap-2.5">
      <span className="text-neutro-600">{etiqueta}</span>
      <span className={`text-right ${mono ? 'font-mono font-semibold' : 'tabular-nums'}`}>{children}</span>
    </div>
  );
}

/**
 * Comprobante de pago con la composición del diseño, pero NO fiscal: sin IVA,
 * CUFE ni numeración de factura electrónica, que exigen un proveedor
 * autorizado por la DIAN. Usa los datos reales de la orden y del negocio.
 *
 * @param {object} props
 * @param {object} props.cobro Cobro con su orden (vehículo, servicio, colaborador, empresa y vale).
 * @param {object|null} props.negocio Nombre, NIT, dirección y teléfono (GET /api/parametros).
 * @param {string} [props.cajero] Quien cobró, si se conoce.
 * @param {boolean} [props.paraImprimir] Marca este papel como el que sale al imprimir.
 */
export function Comprobante({ cobro, negocio, cajero, paraImprimir = false }) {
  const { orden } = cobro;
  const vehiculo = orden?.vehiculo;
  const cliente = orden?.empresa?.nombre ?? vehiculo?.cliente?.nombre ?? 'Consumidor final';
  const esEfectivo = cobro.medioPago === MEDIOS_PAGO.EFECTIVO && cobro.recibido !== null;

  return (
    <div
      data-impresion={paraImprimir || undefined}
      className="mx-auto max-w-75 rounded-comprobante bg-white px-4.5 pt-5 pb-4 text-nota leading-apoyo text-neutro-900 shadow-comprobante"
    >
      <div className="text-center">
        <p className="text-saludo font-bold">{negocio?.nombreNegocio ?? 'Lavadero'}</p>
        {negocio?.nit ? <p className="text-neutro-600">NIT {negocio.nit}</p> : null}
        {negocio?.direccion ? <p className="text-neutro-600">{negocio.direccion}</p> : null}
        {negocio?.telefono ? <p className="text-neutro-600">Tel. {negocio.telefono}</p> : null}
      </div>
      <Separador />
      <p className="text-center text-etiqueta font-bold uppercase">Comprobante de pago</p>
      <p className="mt-0.5 text-center font-mono text-meta font-semibold">{numeroComprobante(cobro)}</p>
      <Separador />
      <Linea etiqueta="Fecha">{formatoFechaHora(cobro.creadoEn)}</Linea>
      {cajero ? <Linea etiqueta="Cajero">{cajero}</Linea> : null}
      <Linea etiqueta="Cliente">{cliente}</Linea>
      <Separador />
      <Linea etiqueta="Vehículo" mono>
        {formatoPlaca(vehiculo?.placa)}
      </Linea>
      <Linea etiqueta="Modelo">{vehiculo?.marca || etiquetaTipoVehiculo(vehiculo?.tipoVehiculo)}</Linea>
      <Linea etiqueta="Colaborador">
        {orden?.colaborador ? `${orden.colaborador.codigo} · ${orden.colaborador.nombre}` : '—'}
      </Linea>
      <Separador />
      <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] gap-1.5 text-etiqueta-menu font-bold text-neutro-600 uppercase">
        <span>Cant</span>
        <span>Descripción</span>
        <span>Valor</span>
      </div>
      <div className="mt-1 grid grid-cols-[22px_minmax(0,1fr)_auto] gap-1.5">
        <span>1</span>
        <span className="min-w-0">
          {orden?.servicio?.nombre}
          <span className="block text-etiqueta-menu font-normal tracking-normal text-neutro-450">
            Servicio N.º {orden?.servicio?.numero}
          </span>
        </span>
        <span className="tabular-nums">{formatoMoneda(cobro.valor)}</span>
      </div>
      <Separador />
      <div className="mt-1 flex justify-between gap-2.5 text-titulo-tarjeta font-bold">
        <span>TOTAL</span>
        <span className="tabular-nums">{formatoMoneda(cobro.valor)}</span>
      </div>
      <Separador />
      <Linea etiqueta="Forma de pago">{etiquetaMedioPago(cobro.medioPago)}</Linea>
      {orden?.vale?.numero ? (
        <Linea etiqueta="Vale" mono>
          {orden.vale.numero}
        </Linea>
      ) : null}
      {esEfectivo ? (
        <>
          <Linea etiqueta="Recibido">{formatoMoneda(cobro.recibido)}</Linea>
          <Linea etiqueta="Cambio">{formatoMoneda(cobro.cambio)}</Linea>
        </>
      ) : null}
      <Separador />
      <p className="text-center text-letra-menuda leading-apoyo text-neutro-450">
        Documento no fiscal: no reemplaza la factura electrónica.
      </p>
      <p className="mt-2 text-center text-nota font-semibold">Gracias por su visita</p>
    </div>
  );
}
