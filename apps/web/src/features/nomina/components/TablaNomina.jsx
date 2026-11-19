import { useState } from 'react';

import { Boton } from '@/components/ui/Boton';
import { IconoFlechaAbajo } from '@/components/ui/iconos/IconoFlechaAbajo';
import { etiquetaTipoDescuento } from '@/constants/etiquetas';
import { formatoFecha } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { plural } from '@/utils/plural';

const COLUMNAS = 'grid-cols-[minmax(0,1.4fr)_0.6fr_1fr_1fr_1fr_1fr_20px]';

const negativo = (valor) => (valor ? `−${formatoMoneda(valor)}` : '—');

function Linea({ etiqueta, valor, fuerte = false, rojo = false }) {
  return (
    <div className={`flex min-h-8 items-center justify-between gap-2.5 text-control ${fuerte ? 'border-t border-dashed border-neutro-275' : ''}`}>
      <span className={fuerte ? 'font-bold text-neutro-900' : 'text-neutro-600'}>{etiqueta}</span>
      <span className={`tabular-nums ${fuerte ? 'font-bold' : 'font-medium'} ${rojo ? 'text-error' : 'text-neutro-900'}`}>{valor}</span>
    </div>
  );
}

function Detalle({ fila, descuentos, puedeRegistrar, alRegistrar, cerrada }) {
  return (
    <div className="grid gap-3 border-t border-neutro-150 bg-neutro-75 p-4 escritorio:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="rounded-tarjeta border border-neutro-200 bg-white px-4 py-3.5">
        <p className="text-control font-semibold">Liquidación de la quincena</p>
        <div className="mt-2 flex flex-col">
          <Linea etiqueta={`Producido (${plural(fila.servicios, 'servicio', 'servicios')})`} valor={formatoMoneda(fila.producido)} />
          <Linea etiqueta="Comisión" valor={formatoMoneda(fila.comision)} />
          <Linea etiqueta="Préstamos" valor={negativo(fila.prestamos)} rojo={fila.prestamos > 0} />
          <Linea etiqueta="Jabón" valor={negativo(fila.jabon)} rojo={fila.jabon > 0} />
          <Linea etiqueta="Multas" valor={negativo(fila.multas)} rojo={fila.multas > 0} />
          <Linea etiqueta="Saldo anterior" valor={negativo(fila.cxc)} rojo={fila.cxc > 0} />
          <Linea etiqueta={cerrada ? 'Pagado' : 'Neto a pagar'} valor={formatoMoneda(fila.neto)} fuerte />
        </div>
        {fila.saldoPendiente > 0 ? (
          <p className="mt-2 rounded-bloque bg-advertencia-suave px-3 py-2 text-meta text-advertencia">
            Los descuentos superan la comisión: {formatoMoneda(fila.saldoPendiente)} pasan a la siguiente quincena.
          </p>
        ) : null}
      </div>

      <div className="rounded-tarjeta border border-neutro-200 bg-white px-4 py-3.5">
        <div className="flex items-center justify-between gap-2.5">
          <p className="text-control font-semibold">Descuentos</p>
          {puedeRegistrar ? (
            <Boton variante="secundario" tamano="pequeno" onClick={() => alRegistrar(fila.colaboradorId)}>
              Registrar
            </Boton>
          ) : null}
        </div>
        {descuentos.length === 0 ? (
          <p className="mt-2.5 border-t border-neutro-100 pt-2.5 text-detalle text-neutro-450">Sin descuentos en esta quincena.</p>
        ) : (
          <ul>
            {descuentos.map((descuento) => (
              <li key={descuento.id} className="mt-2.5 flex justify-between gap-2.5 border-t border-neutro-100 pt-2.5 text-control">
                <span className="min-w-0">
                  <span className="font-semibold">{etiquetaTipoDescuento(descuento.tipo)}</span>
                  <span className="text-neutro-450"> · {formatoFecha(descuento.fecha)}</span>
                  {descuento.observacion ? (
                    <span className="block truncate text-meta text-neutro-600">{descuento.observacion}</span>
                  ) : null}
                </span>
                <span className="font-semibold text-error tabular-nums">−{formatoMoneda(descuento.valor)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Tabla de colaboradores de la nómina (diseño: "Operadores"): servicios,
 * producido, comisión, descuentos y neto, con el total. Cada fila se
 * despliega con la liquidación y los descuentos del colaborador. Todas las
 * cifras vienen del servidor.
 *
 * @param {object} props
 * @param {import('@/features/nomina/api/nomina.api').FilaNomina[]} props.filas
 * @param {object[]} props.descuentos Descuentos del periodo.
 * @param {object} props.totales
 * @param {boolean} props.cerrada La quincena ya se liquidó.
 * @param {boolean} props.puedeRegistrar
 * @param {(colaboradorId: number) => void} props.alRegistrar
 */
export function TablaNomina({ filas, descuentos, totales, cerrada, puedeRegistrar, alRegistrar }) {
  const [abierta, setAbierta] = useState(null);

  return (
    <section aria-labelledby="titulo-colaboradores-nomina" className="mt-3 overflow-hidden rounded-tarjeta border border-neutro-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2.5 border-b border-neutro-150 px-4 py-3.5">
        <h2 id="titulo-colaboradores-nomina" className="text-titulo-tarjeta">
          Colaboradores
        </h2>
        <span className="text-meta text-neutro-600">Comisión según el porcentaje de cada colaborador</span>
      </header>
      <div className="overflow-x-auto">
        <div className="min-w-190">
          <div className={`grid ${COLUMNAS} gap-3 border-b border-neutro-150 px-4 py-2.5 text-encabezado-tabla whitespace-nowrap text-neutro-500 uppercase`}>
            <span>Colaborador</span>
            <span className="text-right">Servicios</span>
            <span className="text-right">Producido</span>
            <span className="text-right">Comisión</span>
            <span className="text-right">Descuentos</span>
            <span className="text-right">{cerrada ? 'Pagado' : 'Neto a pagar'}</span>
            <span />
          </div>
          {filas.length === 0 ? (
            <p className="px-4 py-8 text-center text-detalle text-neutro-450">Todavía no hay servicios ni descuentos en esta quincena.</p>
          ) : (
            <ul>
              {filas.map((fila) => {
                const expandida = abierta === fila.colaboradorId;
                return (
                  <li key={fila.colaboradorId} className="border-b border-neutro-100">
                    <button
                      type="button"
                      aria-expanded={expandida}
                      onClick={() => setAbierta(expandida ? null : fila.colaboradorId)}
                      className={`grid h-14.5 w-full ${COLUMNAS} items-center gap-3 px-4 text-left text-control transition-colors duration-150 hover:bg-neutro-75 ${expandida ? 'bg-neutro-75' : ''}`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="inline-flex size-8.5 shrink-0 items-center justify-center rounded-bloque bg-neutro-100 text-detalle font-bold tabular-nums">
                          {fila.codigo}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{fila.nombre}</span>
                          <span className="block text-nota whitespace-nowrap text-neutro-450">
                            {plural(fila.servicios, 'servicio', 'servicios')}
                          </span>
                        </span>
                      </span>
                      <span className="text-right text-neutro-650 tabular-nums">{fila.servicios}</span>
                      <span className="text-right text-neutro-650 tabular-nums">{formatoMoneda(fila.producido)}</span>
                      <span className="text-right font-semibold tabular-nums">{formatoMoneda(fila.comision)}</span>
                      <span className={`text-right tabular-nums ${fila.descuentos ? 'text-error' : 'text-neutro-375'}`}>
                        {negativo(fila.descuentos)}
                      </span>
                      <span className="text-right text-titulo-tarjeta font-bold tabular-nums">{formatoMoneda(fila.neto)}</span>
                      <IconoFlechaAbajo
                        className={`size-3.5 justify-self-end text-neutro-450 transition-transform duration-200 ${expandida ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {expandida ? (
                      <Detalle
                        fila={fila}
                        descuentos={descuentos.filter((descuento) => descuento.colaboradorId === fila.colaboradorId)}
                        puedeRegistrar={puedeRegistrar}
                        alRegistrar={alRegistrar}
                        cerrada={cerrada}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <div className={`grid ${COLUMNAS} h-12.5 items-center gap-3 bg-neutro-25 px-4 text-control font-semibold`}>
            <span>Total</span>
            <span className="text-right tabular-nums">{totales.servicios}</span>
            <span className="text-right tabular-nums">{formatoMoneda(totales.producido)}</span>
            <span className="text-right tabular-nums">{formatoMoneda(totales.comision)}</span>
            <span className="text-right text-error tabular-nums">{negativo(totales.descuentos)}</span>
            <span className="text-right tabular-nums">{formatoMoneda(totales.neto)}</span>
            <span />
          </div>
        </div>
      </div>
    </section>
  );
}
