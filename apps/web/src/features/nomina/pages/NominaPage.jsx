import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { ConfirmarAccion } from '@/components/ui/ConfirmarAccion';
import { ControlSegmentado } from '@/components/ui/ControlSegmentado';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { Insignia } from '@/components/ui/Insignia';
import { registrarDescuento, liquidarQuincena } from '@/features/nomina/api/nomina.api';
import { RegistrarDescuento } from '@/features/nomina/components/RegistrarDescuento';
import { TablaNomina } from '@/features/nomina/components/TablaNomina';
import { useNomina } from '@/features/nomina/hooks/useNomina';
import { useAviso } from '@/hooks/useAviso';
import { formatoFecha, formatoFechaLarga } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { plural } from '@/utils/plural';

const MENSAJE_POR_DEFECTO = 'No pudimos completar la operación. Inténtalo de nuevo.';

function Indicador({ etiqueta, valor, apoyo, rojo = false }) {
  return (
    <div className="rounded-tarjeta border border-neutro-200 bg-white px-4 py-3.5">
      <p className="text-meta text-neutro-600">{etiqueta}</p>
      <p className={`mt-1 text-indicador whitespace-nowrap tabular-nums ${rojo ? 'text-error' : ''}`}>{valor}</p>
      <p className="mt-0.5 text-nota text-neutro-450">{apoyo}</p>
    </div>
  );
}

/**
 * Nómina quincenal del diseño (ADR 0006): comisión de cada colaborador,
 * descuentos (préstamo, jabón, multa y saldo anterior), neto a pagar y
 * liquidación. Todo lo calcula el servidor con la misma regla que la
 * liquidación. Se puede ver la quincena actual o la anterior.
 */
export function NominaPage() {
  const nomina = useNomina();
  const { aviso, mostrarAviso } = useAviso();
  const [ventana, setVentana] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const quincena = nomina.datos?.quincena;
  const cerrada = Boolean(quincena?.liquidacion);
  const actual = nomina.periodo === 'actual';

  function abrir(nombre, datos = null) {
    setError('');
    setVentana({ nombre, datos });
  }

  async function ejecutar(accion, mensaje) {
    setEnviando(true);
    setError('');
    try {
      await accion();
      nomina.refrescar();
      setVentana(null);
      mostrarAviso(mensaje);
    } catch (fallo) {
      setError(fallo.message || MENSAJE_POR_DEFECTO);
    } finally {
      setEnviando(false);
    }
  }

  const descripcion = quincena
    ? cerrada
      ? `Del ${formatoFecha(quincena.periodo.inicio)} al ${formatoFecha(quincena.periodo.fin)} · liquidada el ${formatoFecha(quincena.liquidacion.liquidadoEn.slice(0, 10))}`
      : `Del ${formatoFecha(quincena.periodo.inicio)} al ${formatoFecha(quincena.periodo.fin)} · se paga el ${formatoFechaLarga(`${quincena.periodo.fin}T12:00:00Z`).toLowerCase()}`
    : 'Quincenas del 1 al 15 y del 16 a fin de mes';

  return (
    <div className="flex flex-col">
      <EncabezadoPagina
        titulo="Nómina"
        descripcion={
          <span className="inline-flex flex-wrap items-center gap-2">
            {quincena ? <Insignia tono={cerrada ? 'exito' : 'primario'}>{cerrada ? 'Pagada' : 'En curso'}</Insignia> : null}
            {descripcion}
          </span>
        }
        acciones={
          <>
            <ControlSegmentado
              etiqueta="Quincena"
              valor={nomina.periodo}
              alCambiar={nomina.elegirPeriodo}
              opciones={[
                { valor: 'anterior', texto: 'Anterior' },
                { valor: 'actual', texto: 'Actual' },
              ]}
            />
            {actual && !cerrada ? (
              <Boton variante="secundario" disabled={!quincena} onClick={() => abrir('descuento')}>
                Registrar descuento
              </Boton>
            ) : null}
            {quincena && !cerrada ? (
              <Boton
                className="shadow-boton-primario"
                disabled={!quincena.puedeLiquidar}
                title={quincena.puedeLiquidar ? undefined : `Se puede liquidar desde el ${formatoFecha(quincena.periodo.fin)}`}
                onClick={() => abrir('liquidar')}
              >
                Liquidar quincena
              </Boton>
            ) : null}
          </>
        }
      />

      {nomina.situacion === 'cargando' ? <EstadoCarga texto="Cargando la nómina…" className="mt-6" /> : null}
      {nomina.situacion === 'error' ? (
        <EstadoError mensaje={nomina.error} alReintentar={nomina.recargar} className="mt-4.5" />
      ) : null}

      {nomina.situacion === 'listo' ? (
        <>
          <div className="mt-4.5 grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3">
            <Indicador
              etiqueta="Comisiones acumuladas"
              valor={formatoMoneda(quincena.totales.comision)}
              apoyo={`De ${formatoMoneda(quincena.totales.producido)} producidos`}
            />
            <Indicador
              etiqueta="Descuentos"
              valor={quincena.totales.descuentos ? `−${formatoMoneda(quincena.totales.descuentos)}` : formatoMoneda(0)}
              apoyo={cerrada ? 'Aplicados en el pago' : `Se descuentan el ${formatoFecha(quincena.periodo.fin)}`}
              rojo={quincena.totales.descuentos > 0}
            />
            <Indicador
              etiqueta={cerrada ? 'Total pagado' : 'Neto a pagar'}
              valor={formatoMoneda(quincena.totales.neto)}
              apoyo={plural(quincena.colaboradores.length, 'colaborador', 'colaboradores')}
            />
            <Indicador
              etiqueta="Servicios del periodo"
              valor={String(quincena.totales.servicios)}
              apoyo="Sin contar las órdenes anuladas"
            />
          </div>

          <TablaNomina
            filas={quincena.colaboradores}
            descuentos={quincena.descuentos}
            totales={quincena.totales}
            cerrada={cerrada}
            puedeRegistrar={actual && !cerrada}
            alRegistrar={(colaboradorId) => abrir('descuento', colaboradorId)}
          />
        </>
      ) : null}

      {ventana?.nombre === 'descuento' ? (
        <RegistrarDescuento
          colaboradores={nomina.datos?.colaboradores ?? []}
          colaboradorInicial={ventana.datos}
          enviando={enviando}
          error={error}
          alCerrar={() => setVentana(null)}
          alGuardar={(descuento) => ejecutar(() => registrarDescuento(descuento), 'Descuento registrado')}
        />
      ) : null}

      <ConfirmarAccion
        abierto={ventana?.nombre === 'liquidar'}
        titulo="Liquidar quincena"
        textoConfirmar="Liquidar"
        enviando={enviando}
        error={error}
        alCancelar={() => setVentana(null)}
        alConfirmar={() =>
          ejecutar(
            () => liquidarQuincena({ inicio: quincena.periodo.inicio, fin: quincena.periodo.fin }),
            'Quincena liquidada',
          )
        }
      >
        {quincena ? (
          <p className="leading-apoyo">
            Se pagarán {formatoMoneda(quincena.totales.neto)} a{' '}
            {plural(quincena.colaboradores.length, 'colaborador', 'colaboradores')}. La quincena queda cerrada: sus
            órdenes ya no se anulan ni se reasignan, y los saldos que no alcancen a cubrirse pasan a la siguiente.
          </p>
        ) : null}
      </ConfirmarAccion>

      <Aviso aviso={aviso} />
    </div>
  );
}
