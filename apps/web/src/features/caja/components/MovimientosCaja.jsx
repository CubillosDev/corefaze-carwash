import { useState } from 'react';

import { Boton } from '@/components/ui/Boton';
import { CampoBusqueda } from '@/components/ui/CampoBusqueda';
import { ControlSegmentado } from '@/components/ui/ControlSegmentado';
import { Dato } from '@/components/ui/Dato';
import { IconoFlechaAbajo } from '@/components/ui/iconos/IconoFlechaAbajo';
import { MEDIOS_PAGO } from '@/constants/dominio';
import { etiquetaCategoriaEgreso, etiquetaMedioPago } from '@/constants/etiquetas';
import { Comprobante } from '@/features/caja/components/Comprobante';
import { normalizarPlaca } from '@/features/vehiculos';
import { formatoHora } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';
import { numeroComprobante } from '@/utils/numeroComprobante';
import { plural } from '@/utils/plural';

const TRANSFERENCIAS = [MEDIOS_PAGO.NEQUI, MEDIOS_PAGO.DAVIPLATA, MEDIOS_PAGO.BANCOLOMBIA];

const FILTROS = [
  { valor: 'todos', texto: 'Todos', cumple: () => true },
  { valor: 'efectivo', texto: 'Efectivo', cumple: (m) => m.tipo === 'cobro' && m.medioPago === MEDIOS_PAGO.EFECTIVO },
  { valor: 'datafono', texto: 'Datáfono', cumple: (m) => m.tipo === 'cobro' && m.medioPago === MEDIOS_PAGO.DATAFONO },
  { valor: 'transferencia', texto: 'Transf.', cumple: (m) => m.tipo === 'cobro' && TRANSFERENCIAS.includes(m.medioPago) },
  { valor: 'credito', texto: 'Crédito', cumple: (m) => m.tipo === 'cobro' && m.medioPago === MEDIOS_PAGO.CREDITO },
  { valor: 'egresos', texto: 'Egresos', cumple: (m) => m.tipo === 'egreso' },
];

/** Total del filtro con las cifras del servidor. */
function totalDelFiltro(filtro, totales) {
  if (filtro === 'todos') {
    return `Cobrado ${formatoMoneda(totales.cobrado)} · egresos ${formatoMoneda(totales.egresos)}`;
  }
  if (filtro === 'egresos') {
    return `−${formatoMoneda(totales.egresos)}`;
  }
  const medios = filtro === 'transferencia' ? TRANSFERENCIAS : [filtro];
  return formatoMoneda(medios.reduce((suma, medio) => suma + (totales.porMedio[medio] ?? 0), 0));
}

const minusculas = (texto) => String(texto ?? '').toLocaleLowerCase('es-CO');

function Detalle({ movimiento, negocio, alImprimir }) {
  if (movimiento.tipo === 'egreso') {
    return (
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
        <Dato etiqueta="Tipo">Egreso de caja</Dato>
        <Dato etiqueta="Categoría">{etiquetaCategoriaEgreso(movimiento.categoria)}</Dato>
        <Dato etiqueta="Concepto">{movimiento.concepto || '—'}</Dato>
        <Dato etiqueta="Monto">{formatoMoneda(movimiento.valor)}</Dato>
      </dl>
    );
  }

  const { orden } = movimiento;
  return (
    <>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
        <Dato etiqueta="Comprobante">{numeroComprobante(movimiento)}</Dato>
        <Dato etiqueta="Servicio">{orden?.servicio?.nombre}</Dato>
        <Dato etiqueta="Colaborador">{orden?.colaborador?.codigo}</Dato>
        <Dato etiqueta="Pago">{etiquetaMedioPago(movimiento.medioPago)}</Dato>
      </dl>
      <div className="mt-3.5 mb-2.5 flex items-center justify-between">
        <span className="text-detalle font-semibold text-neutro-700">Comprobante {numeroComprobante(movimiento)}</span>
        <Boton variante="secundario" tamano="pequeno" onClick={() => alImprimir(movimiento)}>
          Reimprimir
        </Boton>
      </div>
      <Comprobante cobro={movimiento} negocio={negocio} />
    </>
  );
}

/**
 * "Movimientos de hoy" del diseño: cobros y egresos de la caja, del más
 * reciente al más antiguo, con filtros por medio y búsqueda por placa o
 * concepto. Cada fila se despliega con su detalle y, si es un cobro, su
 * comprobante para reimprimir.
 *
 * @param {object} props
 * @param {object[]} props.cobros
 * @param {object[]} props.egresos
 * @param {import('@/features/caja/api/caja.api').TotalesCaja} props.totales
 * @param {object|null} props.negocio
 * @param {(cobro: object) => void} props.alImprimir
 */
export function MovimientosCaja({ cobros, egresos, totales, negocio, alImprimir }) {
  const [filtro, setFiltro] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(null);

  const movimientos = [
    ...cobros.map((cobro) => ({ ...cobro, tipo: 'cobro', clave: `c${cobro.id}` })),
    ...egresos.map((egreso) => ({ ...egreso, tipo: 'egreso', clave: `e${egreso.id}` })),
  ].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));

  const texto = minusculas(busqueda.trim());
  const placa = normalizarPlaca(busqueda);
  const cumpleFiltro = FILTROS.find((opcion) => opcion.valor === filtro).cumple;
  const visibles = movimientos.filter(
    (movimiento) =>
      cumpleFiltro(movimiento) &&
      (texto === '' ||
        (movimiento.tipo === 'cobro'
          ? (placa !== '' && movimiento.orden?.vehiculo?.placa?.includes(placa)) ||
            minusculas(movimiento.orden?.servicio?.nombre).includes(texto)
          : minusculas(movimiento.concepto).includes(texto) ||
            minusculas(etiquetaCategoriaEgreso(movimiento.categoria)).includes(texto))),
  );

  return (
    <section aria-labelledby="titulo-movimientos" className="overflow-hidden rounded-tarjeta border border-neutro-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3">
        <h2 id="titulo-movimientos" className="text-titulo-tarjeta">
          Movimientos de hoy
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <CampoBusqueda
            etiqueta="Buscar movimientos"
            marcador="Placa o concepto"
            valor={busqueda}
            alCambiar={setBusqueda}
            className="w-44 max-w-full"
          />
          <ControlSegmentado
            etiqueta="Filtrar movimientos"
            tamano="compacto"
            opciones={FILTROS.map(({ valor, texto: etiqueta }) => ({ valor, texto: etiqueta }))}
            valor={filtro}
            alCambiar={setFiltro}
          />
        </div>
      </header>

      {visibles.length === 0 ? (
        <p className="border-t border-neutro-100 px-4 py-6.5 text-center text-detalle text-neutro-450">
          {movimientos.length === 0 ? 'Todavía no hay movimientos en esta caja.' : 'Ningún movimiento coincide.'}
        </p>
      ) : (
        <ul>
          {visibles.map((movimiento) => {
            const expandido = abierto === movimiento.clave;
            const esCobro = movimiento.tipo === 'cobro';
            return (
              <li key={movimiento.clave} className="border-t border-neutro-100">
                <button
                  type="button"
                  aria-expanded={expandido}
                  onClick={() => setAbierto(expandido ? null : movimiento.clave)}
                  className={`grid h-11 w-full grid-cols-[56px_minmax(0,1fr)_auto_14px] items-center gap-3 px-4 text-left text-control transition-colors duration-150 hover:bg-neutro-75 escritorio:grid-cols-[64px_minmax(0,1fr)_100px_100px_14px] ${
                    expandido ? 'bg-neutro-75' : ''
                  }`}
                >
                  <span className="text-meta whitespace-nowrap text-neutro-450 tabular-nums">{formatoHora(movimiento.creadoEn)}</span>
                  <span className="min-w-0 truncate">
                    {esCobro ? (
                      <span className="font-mono text-detalle font-semibold">
                        {formatoPlaca(movimiento.orden?.vehiculo?.placa)}
                      </span>
                    ) : (
                      <span className="font-semibold">Egreso</span>
                    )}
                    <span className="text-neutro-550">
                      {' · '}
                      {esCobro ? movimiento.orden?.servicio?.nombre : movimiento.concepto || etiquetaCategoriaEgreso(movimiento.categoria)}
                    </span>
                  </span>
                  <span className="hidden truncate text-meta text-neutro-600 escritorio:block">
                    {esCobro ? etiquetaMedioPago(movimiento.medioPago) : 'Efectivo'}
                  </span>
                  <span
                    className={`text-right font-semibold whitespace-nowrap tabular-nums ${esCobro ? 'text-neutro-900' : 'text-neutro-600'}`}
                  >
                    {esCobro ? formatoMoneda(movimiento.valor) : `−${formatoMoneda(movimiento.valor)}`}
                  </span>
                  <IconoFlechaAbajo
                    className={`size-3.5 text-neutro-450 transition-transform duration-200 ${expandido ? 'rotate-180' : ''}`}
                  />
                </button>
                {expandido ? (
                  <div className="border-t border-neutro-150 bg-neutro-75 px-4 pt-3.5 pb-4.5">
                    <Detalle movimiento={movimiento} negocio={negocio} alImprimir={alImprimir} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <footer className="flex h-10.5 items-center justify-between gap-3 border-t border-neutro-150 bg-neutro-25 px-4 text-detalle">
        <span className="text-neutro-600">{plural(visibles.length, 'movimiento', 'movimientos')}</span>
        <span className="truncate font-semibold tabular-nums">{totalDelFiltro(filtro, totales)}</span>
      </footer>
    </section>
  );
}
