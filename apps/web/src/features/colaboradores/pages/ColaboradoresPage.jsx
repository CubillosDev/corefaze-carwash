import { useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { ConfirmarAccion } from '@/components/ui/ConfirmarAccion';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { GrupoFiltros } from '@/components/ui/GrupoFiltros';
import { IconoMas } from '@/components/ui/iconos/IconoMas';
import { Insignia } from '@/components/ui/Insignia';
import { Tabla } from '@/components/ui/Tabla';
import { ESTADOS_ACTIVIDAD } from '@/constants/dominio';
import { etiquetaEstadoActividad, etiquetaTipoVinculacion } from '@/constants/etiquetas';
import { rolPuedeGestionar } from '@/constants/permisos';
import { RUTAS } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion';
import { cambiarEstadoColaborador, listarColaboradores } from '@/features/colaboradores/api/colaboradores.api';
import { FormularioColaborador } from '@/features/colaboradores/components/FormularioColaborador';
import { estadoContrario } from '@/features/colaboradores/validators/colaborador.schema';
import { useAviso } from '@/hooks/useAviso';
import { useCarga } from '@/hooks/useCarga';
import { useConfirmacion } from '@/hooks/useConfirmacion';
import { formatoPorcentaje } from '@/utils/formatoPorcentaje';
import { formatoTelefono } from '@/utils/formatoTelefono';

const TODOS = 'todos';

const cargarColaboradores = (signal) => listarColaboradores({ signal });

/**
 * Colaboradores del lavadero: lista, registro, edición y activar o desactivar
 * (no se borran). La comisión se muestra tal cual la guarda la API.
 */
export function ColaboradoresPage() {
  const { usuario } = useSesion();
  const lista = useCarga(cargarColaboradores);
  const { aviso, mostrarAviso } = useAviso();
  const [filtro, setFiltro] = useState(TODOS);
  const [edicion, setEdicion] = useState(null);
  const puedeGestionar = rolPuedeGestionar(usuario?.rol, RUTAS.COLABORADORES);

  const reemplazar = (colaborador) =>
    lista.actualizar((actuales) =>
      actuales.some((actual) => actual.id === colaborador.id)
        ? actuales.map((actual) => (actual.id === colaborador.id ? colaborador : actual))
        : [...actuales, colaborador],
    );

  const cambioDeEstado = useConfirmacion({
    ejecutar: (colaborador) => cambiarEstadoColaborador(colaborador.id, estadoContrario(colaborador.estado)),
    alTerminar: (_anterior, colaborador) => {
      reemplazar(colaborador);
      mostrarAviso(`${colaborador.nombre} quedó ${etiquetaEstadoActividad(colaborador.estado).toLowerCase()}`);
    },
  });

  const colaboradores = [...(lista.datos ?? [])].sort((a, b) => a.codigo - b.codigo);
  const cuantos = (estado) => colaboradores.filter((colaborador) => colaborador.estado === estado).length;
  const visibles = filtro === TODOS ? colaboradores : colaboradores.filter((colaborador) => colaborador.estado === filtro);
  const pendiente = cambioDeEstado.pendiente;

  const columnas = [
    {
      clave: 'codigo',
      titulo: 'Código',
      render: (colaborador) => <Avatar nombre={String(colaborador.codigo)} textoLiteral tamano="mediano" tono="neutro" />,
    },
    { clave: 'nombre', titulo: 'Nombre', render: (colaborador) => <span className="font-semibold">{colaborador.nombre}</span> },
    { clave: 'documento', titulo: 'Documento', render: (colaborador) => <span className="text-neutro-650 tabular-nums">{colaborador.documento}</span> },
    { clave: 'telefono', titulo: 'Teléfono', render: (colaborador) => <span className="text-neutro-650 tabular-nums">{formatoTelefono(colaborador.telefono)}</span> },
    {
      clave: 'porcentajeComision',
      titulo: 'Comisión',
      alineacion: 'derecha',
      render: (colaborador) => <span className="tabular-nums">{formatoPorcentaje(colaborador.porcentajeComision)}</span>,
    },
    { clave: 'tipoVinculacion', titulo: 'Vinculación', render: (colaborador) => etiquetaTipoVinculacion(colaborador.tipoVinculacion) },
    {
      clave: 'estado',
      titulo: 'Estado',
      render: (colaborador) => (
        <Insignia tono={colaborador.estado === ESTADOS_ACTIVIDAD.ACTIVO ? 'exito' : 'neutro'}>
          {etiquetaEstadoActividad(colaborador.estado)}
        </Insignia>
      ),
    },
    ...(puedeGestionar
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            alineacion: 'derecha',
            render: (colaborador) => (
              <span className="inline-flex gap-1">
                <Boton variante="fantasma" tamano="pequeno" onClick={() => setEdicion({ colaborador })}>
                  Editar
                </Boton>
                <Boton variante="fantasma" tamano="pequeno" onClick={() => cambioDeEstado.pedir(colaborador)}>
                  {colaborador.estado === ESTADOS_ACTIVIDAD.ACTIVO ? 'Desactivar' : 'Activar'}
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
        titulo="Colaboradores"
        descripcion={`${colaboradores.length} colaboradores registrados`}
        acciones={
          puedeGestionar ? (
            <Boton className="pl-2.75 shadow-boton-primario" onClick={() => setEdicion({ colaborador: null })}>
              <IconoMas className="size-3.75" />
              Nuevo colaborador
            </Boton>
          ) : null
        }
      />

      {lista.situacion === 'cargando' ? <EstadoCarga texto="Cargando colaboradores…" className="mt-6" /> : null}
      {lista.situacion === 'error' ? <EstadoError mensaje={lista.error} alReintentar={lista.recargar} className="mt-4.5" /> : null}
      {lista.situacion === 'listo' ? (
        <>
          <div className="mt-4.5">
            <GrupoFiltros
              etiqueta="Filtrar por estado"
              valor={filtro}
              alCambiar={setFiltro}
              opciones={[
                { valor: TODOS, texto: 'Todos', cantidad: colaboradores.length },
                { valor: ESTADOS_ACTIVIDAD.ACTIVO, texto: 'Activos', cantidad: cuantos(ESTADOS_ACTIVIDAD.ACTIVO) },
                { valor: ESTADOS_ACTIVIDAD.INACTIVO, texto: 'Inactivos', cantidad: cuantos(ESTADOS_ACTIVIDAD.INACTIVO) },
              ]}
            />
          </div>
          <Tabla
            columnas={columnas}
            filas={visibles}
            descripcion="Colaboradores del lavadero"
            mensajeVacio="No hay colaboradores en este filtro."
            className="mt-3"
          />
        </>
      ) : null}

      {edicion ? (
        <FormularioColaborador
          colaborador={edicion.colaborador}
          alCerrar={() => setEdicion(null)}
          alGuardar={(colaborador) => {
            setEdicion(null);
            reemplazar(colaborador);
            mostrarAviso('Colaborador guardado');
          }}
        />
      ) : null}

      <ConfirmarAccion
        abierto={pendiente !== null}
        titulo={
          pendiente?.estado === ESTADOS_ACTIVIDAD.ACTIVO ? `Desactivar a ${pendiente?.nombre}` : `Activar a ${pendiente?.nombre}`
        }
        textoConfirmar={pendiente?.estado === ESTADOS_ACTIVIDAD.ACTIVO ? 'Desactivar' : 'Activar'}
        variante={pendiente?.estado === ESTADOS_ACTIVIDAD.ACTIVO ? 'peligro' : 'primario'}
        enviando={cambioDeEstado.enviando}
        error={cambioDeEstado.error}
        alConfirmar={cambioDeEstado.confirmar}
        alCancelar={cambioDeEstado.cancelar}
      >
        {pendiente?.estado === ESTADOS_ACTIVIDAD.ACTIVO
          ? 'Un colaborador inactivo no recibe órdenes nuevas. Su historial se conserva.'
          : 'Podrá volver a recibir órdenes.'}
      </ConfirmarAccion>

      <Aviso aviso={aviso} />
    </div>
  );
}
