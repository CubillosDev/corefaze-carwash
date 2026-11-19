import { Suspense, useState } from 'react';
import { Link, Outlet } from 'react-router';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { ControlSegmentado } from '@/components/ui/ControlSegmentado';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { GrupoFiltros } from '@/components/ui/GrupoFiltros';
import { IconoJornadas } from '@/components/ui/iconos/IconoJornadas';
import { IconoMas } from '@/components/ui/iconos/IconoMas';
import { Paginacion } from '@/components/ui/Paginacion';
import { SelectorCompacto } from '@/components/ui/SelectorCompacto';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { ESTADOS_ORDEN_CERRADOS } from '@/constants/dominio';
import { etiquetaCategoria, etiquetaEstadoJornada } from '@/constants/etiquetas';
import { rolPuedeAnularOrden, rolPuedeGestionar } from '@/constants/permisos';
import { RUTAS } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion';
import { ConfirmarAnulacion } from '@/features/ordenes-lavado/components/ConfirmarAnulacion';
import { FormularioOrden } from '@/features/ordenes-lavado/components/FormularioOrden';
import { TablaOrdenes } from '@/features/ordenes-lavado/components/TablaOrdenes';
import { TableroOrdenes } from '@/features/ordenes-lavado/components/TableroOrdenes';
import { useCambioEstadoOrden } from '@/features/ordenes-lavado/hooks/useCambioEstadoOrden';
import { useOrdenesLavado } from '@/features/ordenes-lavado/hooks/useOrdenesLavado';
import { useAviso } from '@/hooks/useAviso';
import { useFilasPorPagina } from '@/hooks/useFilasPorPagina';
import { formatoFecha } from '@/utils/formatoFecha';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { paginar } from '@/utils/paginar';
import { plural } from '@/utils/plural';

const TODAS = 'todas';

const VISTAS = [
  { valor: 'tablero', texto: 'Tablero' },
  { valor: 'lista', texto: 'Lista' },
];

/**
 * Órdenes de lavado de una jornada (por defecto, la abierta) en tablero o en
 * lista, con filtros por categoría de servicio, registro de órdenes nuevas y
 * cambios de estado. El detalle de una orden se abre en un panel lateral
 * (ruta hija).
 */
export function OrdenesLavadoPage() {
  const datos = useOrdenesLavado();
  const { usuario } = useSesion();
  const { aviso, mostrarAviso } = useAviso();
  const [vista, setVista] = useState('tablero');
  const [categoria, setCategoria] = useState(TODAS);
  const [pagina, setPagina] = useState(0);
  const filasPorPagina = useFilasPorPagina({ reservado: 330, altoFila: 50 });
  const [formularioAbierto, setFormularioAbierto] = useState(false);
  const cambio = useCambioEstadoOrden({ alCambiar: datos.reemplazarOrden, avisar: mostrarAviso });

  const puedeRegistrar = rolPuedeGestionar(usuario?.rol, RUTAS.ORDENES_LAVADO);
  const puedeAnular = rolPuedeAnularOrden(usuario?.rol);

  const datosDe = (orden) => ({
    vehiculo: datos.vehiculoDe(orden.vehiculoId),
    servicio: datos.servicioDe(orden.servicioId),
    colaborador: datos.colaboradorDe(orden.colaboradorId),
  });
  const categoriaDe = (orden) => etiquetaCategoria(datos.servicioDe(orden.servicioId)?.categoria);
  const categorias = [...new Set(datos.ordenes.map(categoriaDe))];
  const filtros = [
    { valor: TODAS, texto: 'Todas', cantidad: datos.ordenes.length },
    ...categorias.map((nombre) => ({
      valor: nombre,
      texto: nombre,
      cantidad: datos.ordenes.filter((orden) => categoriaDe(orden) === nombre).length,
    })),
  ];
  const visibles =
    categoria === TODAS ? datos.ordenes : datos.ordenes.filter((orden) => categoriaDe(orden) === categoria);
  const enPatio = datos.ordenes.filter((orden) => !ESTADOS_ORDEN_CERRADOS.includes(orden.estado)).length;
  const vistaLista = paginar(visibles, pagina, filasPorPagina);

  const elegirCategoria = (valor) => {
    setCategoria(valor);
    setPagina(0);
  };

  const cambiarEstado = (orden, estado) => cambio.cambiar(orden, estado, datos.vehiculoDe(orden.vehiculoId)?.placa);

  function alCrear(orden) {
    setFormularioAbierto(false);
    datos.elegirJornada(orden.jornadaId);
    datos.recargarOrdenes();
    mostrarAviso(`Orden registrada · ${formatoMoneda(orden.valor)}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EncabezadoPagina
        titulo="Órdenes de lavado"
        descripcion={
          datos.jornada
            ? `Jornada del ${formatoFecha(datos.jornada.fecha)} · ${plural(enPatio, 'vehículo', 'vehículos')} en patio`
            : 'Tablero de la jornada'
        }
        acciones={
          <>
            <ControlSegmentado etiqueta="Vista" opciones={VISTAS} valor={vista} alCambiar={setVista} />
            {puedeRegistrar ? (
              <Boton className="pl-2.75 shadow-boton-primario" onClick={() => setFormularioAbierto(true)}>
                <IconoMas className="size-3.75" />
                Nueva orden
              </Boton>
            ) : null}
          </>
        }
      />

      {datos.situacion === 'cargando' ? <EstadoCarga texto="Cargando órdenes…" className="mt-6" /> : null}

      {datos.situacion === 'error' ? (
        <EstadoError mensaje={datos.error} alReintentar={datos.recargar} className="mt-4.5" />
      ) : null}

      {datos.situacion === 'listo' && datos.jornadas.length === 0 ? (
        <Tarjeta relleno="ninguno" className="mt-4.5">
          <EstadoVacio
            icono={<IconoJornadas className="size-5" />}
            titulo="Aún no hay jornadas"
            descripcion="Las órdenes se registran dentro de una jornada abierta."
            accion={
              <Link to={RUTAS.JORNADAS} className="text-detalle font-semibold">
                Ir a jornadas
              </Link>
            }
          />
        </Tarjeta>
      ) : null}

      {datos.situacion === 'listo' && datos.jornada ? (
        <>
          <div className="mt-4.5 flex flex-wrap items-center justify-between gap-3">
            <GrupoFiltros etiqueta="Filtrar por categoría" opciones={filtros} valor={categoria} alCambiar={elegirCategoria} />
            <SelectorCompacto
              etiqueta="Jornada"
              valor={datos.jornada.id}
              alCambiar={(id) => {
                datos.elegirJornada(Number(id));
                setPagina(0);
              }}
              opciones={[...datos.jornadas]
                .sort((a, b) => b.fecha.localeCompare(a.fecha))
                .map((jornada) => ({
                  valor: jornada.id,
                  texto: `${formatoFecha(jornada.fecha)} · ${etiquetaEstadoJornada(jornada.estado)}`,
                }))}
            />
          </div>

          {vista === 'tablero' ? (
            <TableroOrdenes
              ordenes={visibles}
              datosDe={datosDe}
              puedeAnular={puedeAnular}
              ordenOcupada={cambio.ordenOcupada}
              alCambiarEstado={cambiarEstado}
            />
          ) : (
            <Tarjeta relleno="ninguno" className="mt-3.5 overflow-hidden">
              <TablaOrdenes ordenes={vistaLista.elementos} datosDe={datosDe} />
              {visibles.length > filasPorPagina ? (
                <Paginacion
                  pagina={vistaLista.pagina}
                  totalPaginas={vistaLista.totalPaginas}
                  totalElementos={visibles.length}
                  porPagina={filasPorPagina}
                  alCambiar={setPagina}
                />
              ) : null}
            </Tarjeta>
          )}
        </>
      ) : null}

      <Suspense fallback={null}>
        <Outlet
          context={{
            situacion: datos.situacion,
            ordenes: datos.ordenes,
            datosDe,
            puedeAnular,
            ordenOcupada: cambio.ordenOcupada,
            alCambiarEstado: cambiarEstado,
          }}
        />
      </Suspense>

      {formularioAbierto ? (
        <FormularioOrden alCerrar={() => setFormularioAbierto(false)} alCrear={alCrear} />
      ) : null}

      <ConfirmarAnulacion
        key={cambio.porAnular ? `${cambio.porAnular.placa}-${cambio.porAnular.turno}` : 'cerrada'}
        orden={cambio.porAnular}
        enviando={cambio.anulando}
        error={cambio.errorAnulacion}
        alConfirmar={cambio.confirmarAnulacion}
        alCancelar={cambio.cancelarAnulacion}
      />

      <Aviso aviso={aviso} />
    </div>
  );
}
