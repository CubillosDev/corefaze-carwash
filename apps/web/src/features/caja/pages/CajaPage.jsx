import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { Alerta } from '@/components/ui/Alerta';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { IconoJornadas } from '@/components/ui/iconos/IconoJornadas';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { rolPuedeReabrirCaja } from '@/constants/permisos';
import { RUTAS } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion';
import { AperturaCaja } from '@/features/caja/components/AperturaCaja';
import { CierreCaja } from '@/features/caja/components/CierreCaja';
import { ColaPorCobrar } from '@/features/caja/components/ColaPorCobrar';
import { Comprobante } from '@/features/caja/components/Comprobante';
import { FormularioEgreso } from '@/features/caja/components/FormularioEgreso';
import { IndicadoresCaja } from '@/features/caja/components/IndicadoresCaja';
import { MovimientosCaja } from '@/features/caja/components/MovimientosCaja';
import { PanelCobro } from '@/features/caja/components/PanelCobro';
import { useCaja } from '@/features/caja/hooks/useCaja';
import { useAviso } from '@/hooks/useAviso';
import { useImpresion } from '@/hooks/useImpresion';
import { formatoHora } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';

function estadoDeLaCaja(caja) {
  if (!caja) {
    return { texto: 'Sin abrir', punto: 'bg-neutro-375' };
  }
  return caja.estado === 'abierta'
    ? { texto: `Abierta desde ${formatoHora(caja.abiertaEn)}`, punto: 'bg-exito-solido' }
    : { texto: `Cerrada a las ${formatoHora(caja.cerradaEn)}`, punto: 'bg-neutro-375' };
}

/**
 * Caja del diseño: indicadores, órdenes por cobrar, el panel de cobro con su
 * comprobante, los movimientos del día, egresos y cierre con arqueo. El
 * cobro entrega la orden (terminada -> entregada). Todas las cifras son del
 * servidor. Se puede llegar con ?orden=ID desde el tablero para cobrarla.
 */
export function CajaPage() {
  const { usuario } = useSesion();
  const caja = useCaja();
  const { aviso, mostrarAviso } = useAviso();
  const { aImprimir, imprimir } = useImpresion();
  const [parametros] = useSearchParams();
  const [pestana, setPestana] = useState('listos');
  const [elegidaId, setElegidaId] = useState(() => Number(parametros.get('orden')) || null);
  const [cobroHecho, setCobroHecho] = useState(null);
  const [ventana, setVentana] = useState(null);

  const datos = caja.datos;
  const abierta = datos?.caja?.estado === 'abierta';
  const listos = datos?.porCobrar ?? [];
  const elegida = listos.find((orden) => orden.id === elegidaId) ?? null;
  const estado = estadoDeLaCaja(datos?.caja);

  function abrirVentana(nombre) {
    caja.limpiarError();
    setVentana(nombre);
  }

  async function cobrar(cobro) {
    const registrado = await caja.cobrar(cobro);
    if (registrado) {
      setCobroHecho(registrado);
      setElegidaId(null);
      mostrarAviso(`Cobro registrado · ${formatoMoneda(registrado.valor)}`);
    }
  }

  async function confirmar(accion, valor, mensaje) {
    if (await accion(valor)) {
      setVentana(null);
      mostrarAviso(mensaje);
    }
  }

  function siguiente() {
    setCobroHecho(null);
    setElegidaId(listos[0]?.id ?? null);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EncabezadoPagina
        titulo="Caja"
        descripcion={
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className={`size-1.5 rounded-full ${estado.punto}`} />
            {estado.texto}
          </span>
        }
        acciones={
          datos?.jornada ? (
            <>
              <Boton variante="secundario" disabled={!abierta} onClick={() => abrirVentana('egreso')}>
                Registrar egreso
              </Boton>
              {abierta ? (
                <Boton variante="secundario" onClick={() => abrirVentana('cierre')}>
                  Cerrar caja
                </Boton>
              ) : null}
              {!datos.caja && datos.jornada.estado === 'abierta' ? (
                <Boton className="shadow-boton-primario" onClick={() => abrirVentana('apertura')}>
                  Abrir caja
                </Boton>
              ) : null}
              {datos.caja?.estado === 'cerrada' && rolPuedeReabrirCaja(usuario?.rol) ? (
                <Boton
                  variante="secundario"
                  cargando={caja.enviando}
                  onClick={() => confirmar(caja.reabrir, datos.caja.id, 'Caja reabierta')}
                >
                  Reabrir caja
                </Boton>
              ) : null}
            </>
          ) : null
        }
      />

      {caja.error && !ventana && !elegida ? (
        <Alerta tipo="error" className="mt-3" alCerrar={caja.limpiarError}>
          {caja.error}
        </Alerta>
      ) : null}

      {caja.situacion === 'cargando' ? <EstadoCarga texto="Cargando la caja…" className="mt-6" /> : null}
      {caja.situacion === 'error' ? (
        <EstadoError mensaje={caja.error} alReintentar={caja.recargar} className="mt-4.5" />
      ) : null}

      {caja.situacion === 'listo' && !datos.jornada ? (
        <Tarjeta relleno="ninguno" className="mt-4.5">
          <EstadoVacio
            icono={<IconoJornadas className="size-5" />}
            titulo="Aún no hay jornadas"
            descripcion="La caja se abre dentro de una jornada abierta."
            accion={
              <Link to={RUTAS.JORNADAS} className="text-detalle font-semibold">
                Ir a jornadas
              </Link>
            }
          />
        </Tarjeta>
      ) : null}

      {caja.situacion === 'listo' && datos.jornada ? (
        <>
          <IndicadoresCaja totales={datos.totales} baseInicial={datos.caja?.baseInicial ?? 0} />

          <div className="mt-3 flex flex-col gap-3 amplio:min-h-0 amplio:flex-1 amplio:flex-row amplio:items-stretch">
            <div className="contents amplio:flex amplio:min-h-0 amplio:min-w-0 amplio:flex-1 amplio:flex-col amplio:gap-3 amplio:overflow-y-auto">
              <div className="order-1">
                <ColaPorCobrar
                  listos={listos}
                  enPatio={datos.enPatio}
                  pestana={pestana}
                  alCambiarPestana={setPestana}
                  elegidaId={elegidaId}
                  alElegir={(orden) => {
                    setCobroHecho(null);
                    caja.limpiarError();
                    setElegidaId(orden.id);
                  }}
                />
              </div>
              <div className="order-3">
                <MovimientosCaja
                  cobros={datos.cobros}
                  egresos={datos.egresos}
                  totales={datos.totales}
                  negocio={datos.negocio}
                  alImprimir={imprimir}
                />
              </div>
            </div>
            <div className="order-2 amplio:flex amplio:min-h-0 amplio:items-start">
              <PanelCobro
                cajaAbierta={abierta}
                hayPorCobrar={listos.length > 0}
                orden={elegida}
                cobroHecho={cobroHecho}
                empresas={datos.empresas}
                negocio={datos.negocio}
                enviando={caja.enviando}
                error={ventana ? '' : caja.error}
                alCobrar={cobrar}
                alSiguiente={siguiente}
                alImprimir={imprimir}
              />
            </div>
          </div>
        </>
      ) : null}

      {ventana === 'egreso' ? (
        <FormularioEgreso
          enviando={caja.enviando}
          error={caja.error}
          alGuardar={(egreso) => confirmar(caja.registrarEgreso, egreso, 'Egreso registrado')}
          alCerrar={() => setVentana(null)}
        />
      ) : null}
      {ventana === 'cierre' && datos?.caja ? (
        <CierreCaja
          baseInicial={datos.caja.baseInicial}
          totales={datos.totales}
          enviando={caja.enviando}
          error={caja.error}
          alConfirmar={(contado) => confirmar(caja.cerrar, contado, 'Caja cerrada')}
          alCerrar={() => setVentana(null)}
        />
      ) : null}
      {ventana === 'apertura' ? (
        <AperturaCaja
          enviando={caja.enviando}
          error={caja.error}
          alConfirmar={(base) => confirmar(caja.abrir, base, 'Caja abierta')}
          alCerrar={() => setVentana(null)}
        />
      ) : null}

      {aImprimir ? (
        <div className="hidden print:block">
          <Comprobante cobro={aImprimir} negocio={datos?.negocio} paraImprimir />
        </div>
      ) : null}

      <Aviso aviso={aviso} />
    </div>
  );
}
