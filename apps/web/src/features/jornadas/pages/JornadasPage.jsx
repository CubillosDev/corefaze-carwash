import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { ConfirmarAccion } from '@/components/ui/ConfirmarAccion';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { IconoMas } from '@/components/ui/iconos/IconoMas';
import { Paginacion } from '@/components/ui/Paginacion';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { ESTADOS_JORNADA } from '@/constants/dominio';
import { rolPuedeGestionar, rolPuedeReabrirJornada } from '@/constants/permisos';
import { RUTAS } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion';
import { listarJornadas } from '@/features/jornadas/api/jornadas.api';
import { TablaJornadas } from '@/features/jornadas/components/TablaJornadas';
import { useAccionesJornada } from '@/features/jornadas/hooks/useAccionesJornada';
import { useAviso } from '@/hooks/useAviso';
import { useCarga } from '@/hooks/useCarga';
import { useFilasPorPagina } from '@/hooks/useFilasPorPagina';
import { formatoFecha } from '@/utils/formatoFecha';
import { paginar } from '@/utils/paginar';

const cargarJornadas = (signal) => listarJornadas({}, { signal });

/**
 * Jornadas del lavadero: abrir la de hoy, cerrar la abierta y, para
 * superadmin, reabrir una cerrada. Los totales vienen del servidor.
 */
export function JornadasPage() {
  const { usuario } = useSesion();
  const jornadas = useCarga(cargarJornadas);
  const { aviso, mostrarAviso } = useAviso();
  const [pagina, setPagina] = useState(0);
  const porPagina = useFilasPorPagina({ reservado: 300, altoFila: 50 });
  const acciones = useAccionesJornada({ alCambiar: jornadas.recargar, avisar: mostrarAviso });

  const puedeGestionar = rolPuedeGestionar(usuario?.rol, RUTAS.JORNADAS);
  const lista = [...(jornadas.datos ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const hayAbierta = lista.some((jornada) => jornada.estado === ESTADOS_JORNADA.ABIERTA);
  const vistaPaginada = paginar(lista, pagina, porPagina);

  return (
    <div className="flex flex-col">
      <EncabezadoPagina
        titulo="Jornadas"
        descripcion={`${lista.length} jornadas registradas · Solo puede haber una abierta`}
        acciones={
          puedeGestionar && !hayAbierta && jornadas.situacion === 'listo' ? (
            <Boton className="pl-2.75 shadow-boton-primario" cargando={acciones.enviando} onClick={acciones.abrir}>
              <IconoMas className="size-3.75" />
              Abrir jornada
            </Boton>
          ) : null
        }
      />

      <div className="mt-4.5">
        {jornadas.situacion === 'cargando' ? <EstadoCarga texto="Cargando jornadas…" /> : null}
        {jornadas.situacion === 'error' ? (
          <EstadoError mensaje={jornadas.error} alReintentar={jornadas.recargar} />
        ) : null}
        {jornadas.situacion === 'listo' ? (
          <Tarjeta relleno="ninguno" className="overflow-hidden">
            <TablaJornadas
              jornadas={vistaPaginada.elementos}
              puedeCerrar={puedeGestionar}
              puedeReabrir={rolPuedeReabrirJornada(usuario?.rol)}
              enviando={acciones.enviando}
              alCerrar={acciones.pedirCierre}
              alReabrir={acciones.reabrir}
            />
            {lista.length > porPagina ? (
              <Paginacion
                pagina={vistaPaginada.pagina}
                totalPaginas={vistaPaginada.totalPaginas}
                totalElementos={lista.length}
                porPagina={porPagina}
                alCambiar={setPagina}
              />
            ) : null}
          </Tarjeta>
        ) : null}
      </div>

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
