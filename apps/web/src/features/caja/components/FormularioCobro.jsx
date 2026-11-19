import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoSeleccion } from '@/components/ui/CampoSeleccion';
import { ControlSegmentado } from '@/components/ui/ControlSegmentado';
import { IconoFlechaAbajo } from '@/components/ui/iconos/IconoFlechaAbajo';
import { Placa } from '@/components/ui/Placa';
import { MEDIOS_PAGO } from '@/constants/dominio';
import { etiquetaMedioPago, etiquetaTipoVehiculo } from '@/constants/etiquetas';
import { Comprobante } from '@/features/caja/components/Comprobante';
import { calcularCambio, leerMonto, montosRapidos } from '@/utils/efectivo';
import { formatoMoneda } from '@/utils/formatoMoneda';

const TRANSFERENCIAS = [MEDIOS_PAGO.NEQUI, MEDIOS_PAGO.DAVIPLATA, MEDIOS_PAGO.BANCOLOMBIA];

/** Con más empresas que esto, los botones alargan el panel: se usa una lista. */
const MAXIMO_BOTONES_EMPRESA = 6;

const GRUPOS = [
  { valor: 'efectivo', texto: 'Efectivo' },
  { valor: 'datafono', texto: 'Datáfono' },
  { valor: 'transferencia', texto: 'Transf.' },
  { valor: 'credito', texto: 'Crédito' },
];

const AVISOS_SIN_EFECTIVO = {
  datafono: 'Aprueba el pago en el datáfono',
  transferencia: 'Confirma la transferencia en tu celular',
};

const grupoDe = (medio) =>
  TRANSFERENCIAS.includes(medio) ? 'transferencia' : medio === MEDIOS_PAGO.CREDITO ? 'credito' : medio;

/** La empresa que paga a crédito: la de la orden o, si no, la dueña del vehículo si tiene crédito. */
function empresaInicial(orden, empresas) {
  if (orden.medioPago === MEDIOS_PAGO.CREDITO && orden.clienteId) {
    return orden.clienteId;
  }
  const dueno = orden.vehiculo?.cliente;
  return empresas.some((empresa) => empresa.id === dueno?.id) ? dueno.id : null;
}

const claseChip = (activo) =>
  `rounded-control border px-2.5 text-detalle font-semibold transition-colors duration-150 ${
    activo ? 'border-neutro-900 bg-neutro-900 text-white' : 'border-neutro-275 bg-white text-neutro-900 hover:bg-neutro-75'
  }`;

/**
 * Cobro de una orden terminada en el panel de la caja (diseño: "Cobrando").
 * El total es el valor que fijó el servidor (R4). El medio arranca en el que
 * se registró con la orden y aquí se confirma o se cambia. El cambio que se
 * muestra es una vista previa: el definitivo lo calcula el servidor.
 *
 * @param {object} props
 * @param {object} props.orden
 * @param {object[]} props.empresas Empresas activas con crédito habilitado.
 * @param {object|null} props.negocio
 * @param {boolean} props.enviando
 * @param {string} props.error
 * @param {(cobro: object) => void} props.alCobrar
 */
export function FormularioCobro({ orden, empresas, negocio, enviando, error, alCobrar }) {
  const [grupo, setGrupo] = useState(grupoDe(orden.medioPago));
  const [banco, setBanco] = useState(TRANSFERENCIAS.includes(orden.medioPago) ? orden.medioPago : MEDIOS_PAGO.NEQUI);
  const [recibido, setRecibido] = useState(null);
  const [empresaId, setEmpresaId] = useState(() => empresaInicial(orden, empresas));
  const [vale, setVale] = useState('');
  const [verComprobante, setVerComprobante] = useState(true);

  const total = orden.valor;
  const cambio = calcularCambio(recibido, total);
  const empresa = empresas.find((candidata) => candidata.id === empresaId) ?? null;
  const valeValido = /^[A-Za-z0-9-]{3,30}$/.test(vale.trim());
  const medioPago = grupo === 'transferencia' ? banco : grupo;
  const esCredito = grupo === 'credito';

  const listo =
    !enviando &&
    (grupo !== 'efectivo' || cambio === null || cambio >= 0) &&
    (!esCredito || (empresa !== null && valeValido));

  function cobrar(evento) {
    evento.preventDefault();
    if (!listo) {
      return;
    }
    alCobrar({
      ordenId: orden.id,
      medioPago,
      recibido: grupo === 'efectivo' ? recibido : null,
      clienteId: esCredito ? empresa.id : null,
      numeroVale: esCredito ? vale.trim().toUpperCase() : null,
    });
  }

  const vistaPrevia = {
    id: null,
    creadoEn: new Date().toISOString(),
    medioPago,
    valor: total,
    recibido: grupo === 'efectivo' && cambio !== null && cambio >= 0 ? recibido : null,
    cambio: grupo === 'efectivo' && cambio !== null && cambio >= 0 ? cambio : null,
    orden: {
      ...orden,
      empresa: esCredito && empresa ? { nombre: empresa.nombre } : null,
      vale: esCredito && valeValido ? { numero: vale.trim().toUpperCase() } : null,
    },
  };

  return (
    <form noValidate onSubmit={cobrar} aria-label={`Cobrar la orden de ${orden.vehiculo?.placa}`}>
      <div className="px-4 pt-3.5">
        <div className="flex items-center gap-2.5">
          <Placa placa={orden.vehiculo?.placa ?? ''} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-control font-semibold">
              {orden.vehiculo?.marca || etiquetaTipoVehiculo(orden.vehiculo?.tipoVehiculo)}
            </span>
            <span className="block truncate text-nota text-neutro-450">
              {orden.servicio?.nombre} · Colaborador {orden.colaborador?.codigo}
            </span>
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-2.5 border-t border-neutro-150 pt-2.5">
          <span className="text-meta text-neutro-450">Total a cobrar</span>
          <span className="text-cifra tabular-nums">{formatoMoneda(total)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 px-4 pt-3 pb-3.5">
        <ControlSegmentado etiqueta="Medio de pago" tamano="compacto" opciones={GRUPOS} valor={grupo} alCambiar={setGrupo} />

        {grupo === 'transferencia' ? (
          <div role="group" aria-label="Cuenta de la transferencia" className="grid grid-cols-3 gap-1.25">
            {TRANSFERENCIAS.map((medio) => (
              <button
                key={medio}
                type="button"
                aria-pressed={banco === medio}
                onClick={() => setBanco(medio)}
                className={`h-8 ${claseChip(banco === medio)}`}
              >
                {etiquetaMedioPago(medio)}
              </button>
            ))}
          </div>
        ) : null}

        {grupo === 'efectivo' ? (
          <>
            <div role="group" aria-label="Montos rápidos" className="grid grid-cols-4 gap-1.25">
              {montosRapidos(total).map((monto) => (
                <button
                  key={monto}
                  type="button"
                  aria-pressed={recibido === monto}
                  onClick={() => setRecibido(monto)}
                  className={`h-8 ${claseChip(recibido === monto)}`}
                >
                  {monto === total ? 'Exacto' : `$${monto / 1000}k`}
                </button>
              ))}
            </div>
            <div className="rounded-bloque bg-neutro-75 px-3">
              <label className="flex h-9.5 items-center justify-between gap-2 border-b border-neutro-200">
                <span className="text-detalle text-neutro-600">Recibido</span>
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Escribe el valor"
                  value={recibido === null ? '' : formatoMoneda(recibido)}
                  onChange={(evento) => setRecibido(leerMonto(evento.target.value))}
                  className="h-7.5 w-32.5 bg-transparent text-right text-cuerpo font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-neutro-400"
                />
              </label>
              <div className="flex h-9.5 items-center justify-between" aria-live="polite">
                <span className="text-detalle text-neutro-600">
                  {cambio === null ? 'Cambio' : cambio < 0 ? 'Falta' : 'Cambio'}
                </span>
                <span
                  className={`text-saludo tabular-nums ${
                    cambio === null ? 'font-normal text-neutro-450' : cambio < 0 ? 'text-error' : 'text-neutro-900'
                  }`}
                >
                  {cambio === null ? 'Elige un monto' : formatoMoneda(Math.abs(cambio))}
                </span>
              </div>
            </div>
          </>
        ) : null}

        {esCredito ? (
          <div className="rounded-bloque bg-neutro-75 px-3 pt-2.5 pb-3">
            {empresas.length > MAXIMO_BOTONES_EMPRESA ? null : (
              <p className="text-meta font-semibold text-neutro-700">Empresa</p>
            )}
            {empresas.length === 0 ? (
              <p className="mt-1.5 text-meta text-neutro-600">No hay empresas con crédito habilitado.</p>
            ) : empresas.length > MAXIMO_BOTONES_EMPRESA ? (
              <CampoSeleccion
                etiqueta="Empresa"
                marcador="Elige la empresa que paga"
                opciones={empresas.map((candidata) => ({ valor: candidata.id, texto: candidata.nombre }))}
                value={empresaId ?? ''}
                onChange={(evento) => setEmpresaId(Number(evento.target.value) || null)}
              />
            ) : (
              <div role="group" aria-label="Empresa que paga" className="mt-1.5 grid grid-cols-2 gap-1.25">
                {empresas.map((candidata) => (
                  <button
                    key={candidata.id}
                    type="button"
                    aria-pressed={candidata.id === empresaId}
                    title={candidata.nombre}
                    onClick={() => setEmpresaId(candidata.id)}
                    className={`h-8 truncate ${claseChip(candidata.id === empresaId)}`}
                  >
                    {candidata.nombre.replace(/ S\.A\.S\.| S\.A\.| Ltda\.?/g, '')}
                  </button>
                ))}
              </div>
            )}
            <label className="mt-2 flex h-9.5 items-center justify-between gap-2 rounded-opcion border border-neutro-275 bg-white px-2.5">
              <span className="text-detalle whitespace-nowrap text-neutro-600">N.º de vale</span>
              <input
                value={vale}
                onChange={(evento) => setVale(evento.target.value.toUpperCase())}
                placeholder="Ej. TA-1234"
                maxLength={30}
                autoComplete="off"
                className="h-7.5 w-32.5 min-w-0 bg-transparent text-right font-mono text-cuerpo font-semibold uppercase outline-none placeholder:font-sans placeholder:font-normal placeholder:normal-case placeholder:text-neutro-400"
              />
            </label>
            <p className="mt-1.75 text-nota leading-apoyo text-neutro-600">
              {empresa
                ? `Saldo actual ${formatoMoneda(empresa.saldoPendiente)}${
                    empresa.cupoCredito ? ` de ${formatoMoneda(empresa.cupoCredito)} de cupo` : ''
                  }.`
                : 'Elige la empresa que envía el vehículo.'}
            </p>
          </div>
        ) : null}

        {AVISOS_SIN_EFECTIVO[grupo] ? (
          <p className="flex h-9.5 items-center rounded-bloque bg-neutro-75 px-3 text-detalle text-neutro-600">
            {AVISOS_SIN_EFECTIVO[grupo]}
          </p>
        ) : null}

        {error ? <Alerta tipo="error">{error}</Alerta> : null}

        <Boton type="submit" tamano="alto" cargando={enviando} disabled={!listo} className="w-full rounded-bloque">
          {esCredito ? `Cargar a crédito ${formatoMoneda(total)}` : `Cobrar ${formatoMoneda(total)}`}
        </Boton>
      </div>

      <div className="border-t border-neutro-150 bg-neutro-75 px-4 pt-2.5 pb-4">
        <button
          type="button"
          aria-expanded={verComprobante}
          onClick={() => setVerComprobante((visible) => !visible)}
          className="flex h-7 items-center gap-1.5 text-detalle font-semibold text-neutro-700"
        >
          <IconoFlechaAbajo
            className={`size-3.25 transition-transform duration-200 ${verComprobante ? 'rotate-180' : '-rotate-90'}`}
          />
          {verComprobante ? 'Ocultar comprobante' : 'Ver comprobante'}
        </button>
        {verComprobante ? (
          <div className="mt-2.5">
            <Comprobante cobro={vistaPrevia} negocio={negocio} />
          </div>
        ) : null}
      </div>
    </form>
  );
}
