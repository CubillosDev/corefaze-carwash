import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { ConfirmarAccion } from '@/components/ui/ConfirmarAccion';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { GrupoFiltros } from '@/components/ui/GrupoFiltros';
import { IconoMas } from '@/components/ui/iconos/IconoMas';
import { Insignia } from '@/components/ui/Insignia';
import { Paginacion } from '@/components/ui/Paginacion';
import { Tabla } from '@/components/ui/Tabla';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { TIPOS_VEHICULO } from '@/constants/dominio';
import { etiquetaCategoria, etiquetaTipoVehiculo } from '@/constants/etiquetas';
import { rolPuedeGestionar } from '@/constants/permisos';
import { RUTAS } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion';
import { eliminarServicio, listarServicios } from '@/features/servicios/api/servicios.api';
import { FormularioServicio } from '@/features/servicios/components/FormularioServicio';
import { useAviso } from '@/hooks/useAviso';
import { useCarga } from '@/hooks/useCarga';
import { useConfirmacion } from '@/hooks/useConfirmacion';
import { useFilasPorPagina } from '@/hooks/useFilasPorPagina';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { paginar } from '@/utils/paginar';

const TODAS = 'todas';
const ORDEN_TIPOS = Object.values(TIPOS_VEHICULO);

const cargarServicios = (signal) => listarServicios({ signal });

/**
 * Catálogo de servicios con sus tarifas por tipo de vehículo, tal como las
 * guarda la API. Quien administra registra, edita y elimina (la API rechaza
 * eliminar un servicio con órdenes).
 */
export function ServiciosPage() {
  const { usuario } = useSesion();
  const lista = useCarga(cargarServicios);
  const { aviso, mostrarAviso } = useAviso();
  const [categoria, setCategoria] = useState(TODAS);
  const [pagina, setPagina] = useState(0);
  // Cada servicio muestra sus tarifas en tres líneas: la fila es más alta.
  const porPagina = useFilasPorPagina({ reservado: 290, altoFila: 69, enAngosta: 6 });
  const [edicion, setEdicion] = useState(null);
  const puedeGestionar = rolPuedeGestionar(usuario?.rol, RUTAS.SERVICIOS);

  const eliminacion = useConfirmacion({
    ejecutar: (servicio) => eliminarServicio(servicio.id),
    alTerminar: (servicio) => {
      lista.actualizar((actuales) => actuales.filter((actual) => actual.id !== servicio.id));
      mostrarAviso('Servicio eliminado');
    },
  });

  const servicios = [...(lista.datos ?? [])].sort((a, b) => a.numero - b.numero);
  const categorias = [...new Set(servicios.map((servicio) => etiquetaCategoria(servicio.categoria)))];
  const visibles =
    categoria === TODAS ? servicios : servicios.filter((servicio) => etiquetaCategoria(servicio.categoria) === categoria);
  const vista = paginar(visibles, pagina, porPagina);

  const columnas = [
    {
      clave: 'numero',
      titulo: 'N.º',
      render: (servicio) => (
        <span className="inline-flex size-7 items-center justify-center rounded-opcion bg-primario-800 text-meta font-bold text-white">
          {servicio.numero}
        </span>
      ),
    },
    {
      clave: 'nombre',
      titulo: 'Servicio',
      render: (servicio) => (
        <span className="block min-w-40">
          <span className="block font-semibold">{servicio.nombre}</span>
          {servicio.descripcion ? <span className="block text-nota text-neutro-550">{servicio.descripcion}</span> : null}
        </span>
      ),
    },
    { clave: 'categoria', titulo: 'Categoría', render: (servicio) => etiquetaCategoria(servicio.categoria) },
    {
      clave: 'tarifas',
      titulo: 'Tarifas',
      render: (servicio) => (
        <ul className="flex flex-col gap-0.5 text-meta">
          {[...servicio.tarifas]
            .sort((a, b) => ORDEN_TIPOS.indexOf(a.tipoVehiculo) - ORDEN_TIPOS.indexOf(b.tipoVehiculo))
            .map((tarifa) => (
              <li key={tarifa.tipoVehiculo} className="whitespace-nowrap">
                <span className="text-neutro-600">{etiquetaTipoVehiculo(tarifa.tipoVehiculo)}</span>{' '}
                <span className="font-semibold tabular-nums">{formatoMoneda(tarifa.valor)}</span>
              </li>
            ))}
        </ul>
      ),
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      render: (servicio) => (
        <Insignia tono={servicio.activo ? 'exito' : 'neutro'}>{servicio.activo ? 'Activo' : 'Inactivo'}</Insignia>
      ),
    },
    ...(puedeGestionar
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            alineacion: 'derecha',
            render: (servicio) => (
              <span className="inline-flex gap-1">
                <Boton variante="fantasma" tamano="pequeno" onClick={() => setEdicion({ servicio })}>
                  Editar
                </Boton>
                <Boton variante="fantasma" tamano="pequeno" onClick={() => eliminacion.pedir(servicio)}>
                  Eliminar
                </Boton>
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col">
      <EncabezadoPagina
        titulo="Catálogo de servicios"
        descripcion={`${servicios.length} servicios · Las tarifas las fija el lavadero`}
        acciones={
          puedeGestionar ? (
            <Boton className="pl-2.75 shadow-boton-primario" onClick={() => setEdicion({ servicio: null })}>
              <IconoMas className="size-3.75" />
              Nuevo servicio
            </Boton>
          ) : null
        }
      />

      {lista.situacion === 'cargando' ? <EstadoCarga texto="Cargando servicios…" className="mt-6" /> : null}
      {lista.situacion === 'error' ? <EstadoError mensaje={lista.error} alReintentar={lista.recargar} className="mt-4.5" /> : null}
      {lista.situacion === 'listo' ? (
        <>
          <div className="mt-4.5">
            <GrupoFiltros
              etiqueta="Filtrar por categoría"
              valor={categoria}
              alCambiar={(valor) => {
                setCategoria(valor);
                setPagina(0);
              }}
              opciones={[
                { valor: TODAS, texto: 'Todas', cantidad: servicios.length },
                ...categorias.map((nombre) => ({
                  valor: nombre,
                  texto: nombre,
                  cantidad: servicios.filter((servicio) => etiquetaCategoria(servicio.categoria) === nombre).length,
                })),
              ]}
            />
          </div>
          <Tarjeta relleno="ninguno" className="mt-3 overflow-hidden">
            <Tabla
              columnas={columnas}
              filas={vista.elementos}
              descripcion="Servicios del catálogo con sus tarifas"
              mensajeVacio="No hay servicios registrados."
              enTarjeta
            />
            {visibles.length > porPagina ? (
              <Paginacion
                pagina={vista.pagina}
                totalPaginas={vista.totalPaginas}
                totalElementos={visibles.length}
                porPagina={porPagina}
                alCambiar={setPagina}
              />
            ) : null}
          </Tarjeta>
        </>
      ) : null}

      {edicion ? (
        <FormularioServicio
          servicio={edicion.servicio}
          alCerrar={() => setEdicion(null)}
          alGuardar={() => {
            setEdicion(null);
            lista.recargar();
            mostrarAviso('Servicio guardado');
          }}
        />
      ) : null}

      <ConfirmarAccion
        abierto={eliminacion.pendiente !== null}
        titulo={`Eliminar «${eliminacion.pendiente?.nombre ?? ''}»`}
        textoConfirmar="Eliminar"
        variante="peligro"
        enviando={eliminacion.enviando}
        error={eliminacion.error}
        alConfirmar={eliminacion.confirmar}
        alCancelar={eliminacion.cancelar}
      >
        El servicio sale del catálogo. Si ya tiene órdenes, la API no lo permite: en ese caso,
        desactívalo.
      </ConfirmarAccion>

      <Aviso aviso={aviso} />
    </div>
  );
}
