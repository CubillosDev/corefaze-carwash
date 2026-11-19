import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { ConfirmarAccion } from '@/components/ui/ConfirmarAccion';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { IconoMas } from '@/components/ui/iconos/IconoMas';
import { Indicador } from '@/components/ui/Indicador';
import { ESTADOS_ORDEN } from '@/constants/dominio';
import { rolPuedeGestionar } from '@/constants/permisos';
import { RUTAS } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion';
import { IngresosAcumulados } from '@/features/inicio/components/IngresosAcumulados';
import { PatioEnVivo } from '@/features/inicio/components/PatioEnVivo';
import { RequiereAtencion } from '@/features/inicio/components/RequiereAtencion';
import { useTablero } from '@/features/inicio/hooks/useTablero';
import { PanelJornada, useAccionesJornada } from '@/features/jornadas';
import { FormularioOrden } from '@/features/ordenes-lavado';
import { useAviso } from '@/hooks/useAviso';
import { variacionALaHora } from '@/utils/curvaAcumulada';
import { contarPorEstado } from '@/utils/estadosOrden';
import { formatoFecha, formatoFechaLarga } from '@/utils/formatoFecha';
import { formatoMinutos, minutosDesde } from '@/utils/formatoMinutos';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { mayusculaInicial } from '@/utils/mayusculaInicial';
import { plural } from '@/utils/plural';

/** Permanencia media a partir de la cual el patio va lento, como en el diseño. */
const MINUTOS_PATIO_LENTO = 30;


/**
 * Tablero de inicio: indicadores de la jornada abierta (los totales los
 * calcula el servidor), lo que requiere atención, el patio por fase y el panel
 * para abrir o cerrar la jornada.
 */
export function InicioPage() {
  const tablero = useTablero();
  const navegar = useNavigate();
  const { usuario } = useSesion();
  const { aviso, mostrarAviso } = useAviso();
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const acciones = useAccionesJornada({ alCambiar: tablero.recargar, avisar: mostrarAviso });
  const { refrescar } = tablero;
  const alAbrirseDesdeElCelular = useCallback(() => {
    refrescar();
    mostrarAviso('La jornada se abrió desde el celular');
  }, [refrescar, mostrarAviso]);

  const primerNombre = String(usuario?.nombre ?? '').trim().split(/\s+/)[0];
  const jornada = tablero.datos?.jornada ?? null;
  const totales = tablero.datos?.totales ?? null;
  const conteo = contarPorEstado(tablero.datos?.ordenes ?? []);
  const caja = tablero.datos?.caja ?? null;
  const curva = tablero.datos?.curva ?? null;
  const cargadoEn = tablero.datos?.cargadoEn ?? 0;
  const enPatio = caja ? caja.enPatio.length : conteo[ESTADOS_ORDEN.REGISTRADA] + conteo[ESTADOS_ORDEN.EN_PROCESO];
  const permanencia = caja?.enPatio.length
    ? Math.round(caja.enPatio.reduce((suma, orden) => suma + minutosDesde(orden.creadoEn, cargadoEn), 0) / caja.enPatio.length)
    : null;
  const listos = caja ? caja.totales.vehiculosPorCobrar : conteo[ESTADOS_ORDEN.TERMINADA];
  const variacion = variacionALaHora(curva);

  function alCrear(orden) {
    setFormularioAbierto(false);
    tablero.recargar();
    mostrarAviso(`Orden registrada · ${formatoMoneda(orden.valor)}`);
  }

  return (
    <div className="flex flex-1 flex-col ajustado:min-h-0">
      <EncabezadoPagina
        titulo={primerNombre ? `Buen día, ${primerNombre}` : 'Buen día'}
        descripcion={`${formatoFechaLarga(new Date())} · ${
          jornada ? `jornada del ${formatoFecha(jornada.fecha)}` : 'sin jornada abierta'
        }`}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => navegar(RUTAS.CAJA)}>
              Ir a caja
            </Boton>
            {rolPuedeGestionar(usuario?.rol, RUTAS.ORDENES_LAVADO) ? (
              <Boton className="pl-2.75" onClick={() => setFormularioAbierto(true)}>
                <IconoMas className="size-3.75" />
                Nueva orden
              </Boton>
            ) : null}
          </>
        }
      />

      {tablero.situacion === 'cargando' ? <EstadoCarga texto="Cargando el tablero…" className="mt-6" /> : null}
      {tablero.situacion === 'error' ? (
        <EstadoError mensaje={tablero.error} alReintentar={tablero.recargar} className="mt-4" />
      ) : null}

      {tablero.situacion === 'listo' ? (
        <div className="mt-4 flex flex-1 flex-wrap items-stretch gap-3 escritorio:flex-nowrap ajustado:min-h-0">
          <div className="flex min-w-0 flex-[1_1_0] flex-col ajustado:min-h-0">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(130px,100%),1fr))] gap-3">
              <Indicador
                etiqueta="Ingresos de la jornada"
                valor={formatoMoneda(totales?.totalGeneral ?? 0)}
                nota={variacion === null ? null : `${variacion > 0 ? '+' : ''}${variacion} %`}
                atencion={variacion !== null && variacion < 0}
                apoyo={
                  curva?.etiquetaAnterior ? (
                    <>
                      {`${mayusculaInicial(curva.etiquetaAnterior)} a esta hora: `}
                      <span className="whitespace-nowrap">{formatoMoneda(curva.anteriorALaHora)}</span>
                    </>
                  ) : (
                    'Calculado por el sistema'
                  )
                }
                hacia={RUTAS.REPORTES}
              />
              <Indicador
                etiqueta="Servicios de la jornada"
                valor={String(totales?.cantidadServicios ?? 0)}
                apoyo={jornada ? `Jornada del ${formatoFecha(jornada.fecha)}` : 'Sin jornada abierta'}
                hacia={RUTAS.JORNADAS}
              />
              <Indicador
                etiqueta="En patio ahora"
                valor={String(enPatio)}
                nota={permanencia === null ? null : permanencia > MINUTOS_PATIO_LENTO ? 'Lento' : 'Fluido'}
                atencion={permanencia !== null && permanencia > MINUTOS_PATIO_LENTO}
                apoyo={permanencia === null ? 'Registradas y en proceso' : `Permanencia media ${formatoMinutos(permanencia)}`}
                hacia={RUTAS.ORDENES_LAVADO}
              />
              <Indicador
                etiqueta="Por cobrar"
                valor={caja ? formatoMoneda(caja.totales.porCobrar) : String(listos)}
                nota={listos > 0 ? plural(listos, 'listo', 'listos') : 'Al día'}
                atencion={listos > 0}
                apoyo={plural(listos, 'vehículo terminado', 'vehículos terminados')}
                hacia={RUTAS.CAJA}
              />
            </div>

            <div className="mt-3 flex min-h-55 flex-1 flex-wrap gap-3 ajustado:min-h-25">
              <IngresosAcumulados
                curva={curva}
                etiquetaAnterior={curva?.etiquetaAnterior ?? ''}
                aviso={jornada ? 'No pudimos cargar los ingresos por hora.' : 'Abre la jornada para ver la curva del día.'}
              />
            </div>

            <div className="mt-3 flex shrink-0 flex-wrap gap-3">
              <RequiereAtencion jornada={jornada} caja={caja} insumos={tablero.datos?.insumos ?? null} ahora={cargadoEn} />
              <PatioEnVivo conteo={conteo} />
            </div>
          </div>

          <PanelJornada
            jornada={jornada}
            nombre={usuario?.nombre}
            puedeGestionar={rolPuedeGestionar(usuario?.rol, RUTAS.JORNADAS)}
            enviando={acciones.enviando}
            alAbrir={acciones.abrir}
            alCerrar={() => acciones.pedirCierre(jornada)}
            alAbrirseDesdeElCelular={alAbrirseDesdeElCelular}
          />
        </div>
      ) : null}

      {formularioAbierto ? (
        <FormularioOrden alCerrar={() => setFormularioAbierto(false)} alCrear={alCrear} />
      ) : null}

      <ConfirmarAccion
        abierto={acciones.porCerrar !== null}
        titulo={`Cerrar la jornada del ${formatoFecha(acciones.porCerrar?.fecha)}`}
        textoConfirmar="Cerrar jornada"
        enviando={acciones.enviando}
        error={acciones.errorCierre}
        alConfirmar={acciones.confirmarCierre}
        alCancelar={acciones.cancelarCierre}
      >
        Después de cerrarla no se registran más órdenes en ella. Solo un superadministrador puede
        reabrirla.
      </ConfirmarAccion>

      <Aviso aviso={aviso} />
    </div>
  );
}
