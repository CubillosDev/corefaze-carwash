import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoMonto } from '@/components/ui/CampoMonto';
import { Modal } from '@/components/ui/Modal';
import { MEDIOS_PAGO } from '@/constants/dominio';
import { formatoMoneda } from '@/utils/formatoMoneda';

const TRANSFERENCIAS = [MEDIOS_PAGO.NEQUI, MEDIOS_PAGO.DAVIPLATA, MEDIOS_PAGO.BANCOLOMBIA];

const RESULTADOS = {
  pendiente: { texto: 'Ingresa el efectivo contado', clases: 'bg-neutro-75 text-neutro-600' },
  cuadrada: { texto: 'Caja cuadrada', clases: 'bg-exito-suave text-exito' },
  sobrante: { texto: 'Sobrante', clases: 'bg-advertencia-suave text-advertencia' },
  faltante: { texto: 'Faltante', clases: 'bg-error-suave text-error' },
};

/**
 * "Cierre de caja" del diseño: el arqueo. El esperado (base + cobros en
 * efectivo − egresos) viene del servidor; la diferencia que se muestra
 * mientras se escribe es una vista previa: la definitiva la guarda el
 * servidor al cerrar.
 *
 * @param {object} props
 * @param {string} [props.titulo] Por ejemplo, el de una caja que quedó abierta en otra jornada.
 * @param {number} props.baseInicial
 * @param {import('@/features/caja/api/caja.api').TotalesCaja} props.totales
 * @param {boolean} props.enviando
 * @param {string} props.error
 * @param {(efectivoContado: number) => void} props.alConfirmar
 * @param {() => void} props.alCerrar
 */
export function CierreCaja({ titulo = 'Cierre de caja', baseInicial, totales, enviando, error, alConfirmar, alCerrar }) {
  const [contado, setContado] = useState(null);
  const diferencia = contado === null ? null : contado - totales.efectivoEsperado;
  const resultado =
    diferencia === null ? 'pendiente' : diferencia === 0 ? 'cuadrada' : diferencia > 0 ? 'sobrante' : 'faltante';

  const filas = [
    { etiqueta: 'Base inicial', valor: formatoMoneda(baseInicial) },
    { etiqueta: 'Cobros en efectivo', valor: `+${formatoMoneda(totales.porMedio[MEDIOS_PAGO.EFECTIVO] ?? 0)}` },
    { etiqueta: 'Egresos', valor: `−${formatoMoneda(totales.egresos)}` },
    { etiqueta: 'Efectivo esperado', valor: formatoMoneda(totales.efectivoEsperado), fuerte: true },
  ];
  const otros = [
    { etiqueta: 'Datáfono', valor: totales.porMedio[MEDIOS_PAGO.DATAFONO] ?? 0 },
    {
      etiqueta: 'Transferencias',
      valor: TRANSFERENCIAS.reduce((suma, medio) => suma + (totales.porMedio[medio] ?? 0), 0),
    },
    { etiqueta: 'Crédito', valor: totales.porMedio[MEDIOS_PAGO.CREDITO] ?? 0 },
  ];

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={titulo}
      descripcion="Cuenta el efectivo de la caja y compáralo con lo esperado."
      tamano="pequeno"
      pie={
        <>
          <Boton variante="secundario" tamano="grande" className="flex-1" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton
            tamano="grande"
            className="flex-1"
            cargando={enviando}
            disabled={contado === null || enviando}
            onClick={() => alConfirmar(contado)}
          >
            Confirmar cierre
          </Boton>
        </>
      }
    >
      <dl>
        {filas.map((fila) => (
          <div key={fila.etiqueta} className="flex h-8 items-center justify-between border-b border-neutro-100 text-control">
            <dt className="text-neutro-600">{fila.etiqueta}</dt>
            <dd className={`tabular-nums ${fila.fuerte ? 'font-bold' : 'font-medium'}`}>{fila.valor}</dd>
          </div>
        ))}
      </dl>

      <CampoMonto
        etiqueta="Efectivo contado"
        valor={contado}
        alCambiar={setContado}
        placeholder={formatoMoneda(totales.efectivoEsperado)}
        className="mt-4"
        requerido
      />

      <div
        aria-live="polite"
        className={`mt-2.5 flex items-center justify-between rounded-bloque px-3 py-2.5 ${RESULTADOS[resultado].clases}`}
      >
        <span className="text-detalle font-semibold">{RESULTADOS[resultado].texto}</span>
        {diferencia !== null ? (
          <span className="text-titulo-tarjeta font-bold tabular-nums">
            {diferencia > 0 ? '+' : diferencia < 0 ? '−' : ''}
            {formatoMoneda(Math.abs(diferencia))}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {otros.map((otro) => (
          <div key={otro.etiqueta} className="rounded-bloque bg-neutro-75 px-2.75 py-2.25">
            <p className="text-micro text-neutro-600">{otro.etiqueta}</p>
            <p className="mt-px text-titulo-tarjeta tabular-nums">{formatoMoneda(otro.valor)}</p>
          </div>
        ))}
      </div>

      {error ? (
        <Alerta tipo="error" className="mt-3">
          {error}
        </Alerta>
      ) : null}
    </Modal>
  );
}
