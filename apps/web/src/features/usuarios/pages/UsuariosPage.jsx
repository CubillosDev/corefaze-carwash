import { useCallback, useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Avatar } from '@/components/ui/Avatar';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { CampoBusqueda } from '@/components/ui/CampoBusqueda';
import { ConfirmarAccion } from '@/components/ui/ConfirmarAccion';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { GrupoFiltros } from '@/components/ui/GrupoFiltros';
import { Insignia } from '@/components/ui/Insignia';
import { Paginacion } from '@/components/ui/Paginacion';
import { SelectorCompacto } from '@/components/ui/SelectorCompacto';
import { Tabla } from '@/components/ui/Tabla';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { esRolPendiente, etiquetaDeRol, rolPuedeGestionar, tonoDeRol } from '@/constants/permisos';
import { RUTAS } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion';
import { cambiarEstadoUsuario, listarUsuarios } from '@/features/usuarios/api/usuarios.api';
import { AsignarRol } from '@/features/usuarios/components/AsignarRol';
import { ListaUsuarios } from '@/features/usuarios/components/ListaUsuarios';
import { useAviso } from '@/hooks/useAviso';
import { useCarga } from '@/hooks/useCarga';
import { useConfirmacion } from '@/hooks/useConfirmacion';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilasPorPagina } from '@/hooks/useFilasPorPagina';
import { usePantallaAngosta } from '@/hooks/usePantallaAngosta';
import { formatoFecha } from '@/utils/formatoFecha';
import { plural } from '@/utils/plural';

const TODOS = 'todos';
const PENDIENTE = 'pendiente';
const BUSQUEDA_MAXIMA = 100;

const FILTROS_ROL = [
  { valor: TODOS, texto: 'Todos' },
  { valor: PENDIENTE, texto: 'Pendientes' },
  { valor: 'superadmin', texto: 'Superadministradores' },
  { valor: 'administrador', texto: 'Administradores' },
  { valor: 'soporte', texto: 'Soporte' },
];

const FILTROS_ESTADO = [
  { valor: TODOS, texto: 'Todos los estados' },
  { valor: 'activos', texto: 'Activos' },
  { valor: 'inactivos', texto: 'Inactivos' },
];

/** La página pedida y, aparte, cuántas cuentas activas esperan aprobación. */
async function cargarUsuarios(filtros, signal) {
  const [lista, pendientes] = await Promise.all([
    listarUsuarios(filtros, { signal }),
    listarUsuarios({ rol: PENDIENTE, activo: true, porPagina: 1 }, { signal }),
  ]);
  return { ...lista, pendientes: pendientes.total };
}

/**
 * Cuentas del panel: búsqueda por nombre o correo, filtros por rol y estado,
 * lista paginada en el servidor. El superadministrador aprueba las cuentas
 * pendientes, cambia roles y activa o desactiva (no se borran); el
 * administrador solo consulta.
 */
export function UsuariosPage() {
  const { usuario: sesion } = useSesion();
  const puedeGestionar = rolPuedeGestionar(sesion?.rol, RUTAS.USUARIOS);
  const { aviso, mostrarAviso } = useAviso();
  const [busqueda, setBusqueda] = useState('');
  const [rol, setRol] = useState(TODOS);
  const [estado, setEstado] = useState(TODOS);
  const [pagina, setPagina] = useState(0);
  const [enEdicion, setEnEdicion] = useState(null);
  const porPagina = useFilasPorPagina();
  const angosta = usePantallaAngosta();
  const texto = useDebounce(busqueda.trim().slice(0, BUSQUEDA_MAXIMA));

  const cargar = useCallback(
    (signal) =>
      cargarUsuarios(
        {
          rol: rol === TODOS ? undefined : rol,
          activo: estado === TODOS ? undefined : estado === 'activos',
          busqueda: texto,
          pagina: pagina + 1,
          porPagina,
        },
        signal,
      ),
    [rol, estado, texto, pagina, porPagina],
  );
  const carga = useCarga(cargar);

  const cambioDeEstado = useConfirmacion({
    ejecutar: (usuario) => cambiarEstadoUsuario(usuario.id, !usuario.activo),
    alTerminar: (_anterior, usuario) => {
      carga.refrescar();
      mostrarAviso(`${usuario.nombre} quedó ${usuario.activo ? 'activo' : 'inactivo'}`);
    },
  });

  const cambiarFiltro = (cambiar) => (valor) => {
    cambiar(valor);
    setPagina(0);
  };

  const datos = carga.datos;
  const usuarios = datos?.usuarios ?? [];
  const pendientes = datos?.pendientes ?? 0;
  const enCurso = cambioDeEstado.pendiente;
  const mensajeVacio = texto ? `No hay cuentas que coincidan con «${texto}».` : 'No hay cuentas en este filtro.';

  const columnas = [
    {
      clave: 'nombre',
      titulo: 'Usuario',
      render: (usuario) => (
        <span className="flex items-center gap-2.5">
          <Avatar nombre={usuario.nombre} tamano="mediano" tono={usuario.activo ? 'primario' : 'neutro'} />
          <span className="flex min-w-0 flex-col">
            <span className="flex items-center gap-1.5 font-semibold">
              {usuario.nombre}
              {usuario.id === sesion?.id ? <span className="text-meta font-medium text-neutro-500">(tú)</span> : null}
            </span>
            <span className="text-detalle text-neutro-600">{usuario.email}</span>
          </span>
        </span>
      ),
    },
    {
      clave: 'rol',
      titulo: 'Rol',
      render: (usuario) => <Insignia tono={tonoDeRol(usuario.rol)}>{etiquetaDeRol(usuario.rol)}</Insignia>,
    },
    {
      clave: 'activo',
      titulo: 'Estado',
      render: (usuario) => <Insignia tono={usuario.activo ? 'exito' : 'neutro'}>{usuario.activo ? 'Activo' : 'Inactivo'}</Insignia>,
    },
    {
      clave: 'creadoEn',
      titulo: 'Creada',
      render: (usuario) => <span className="text-neutro-650 tabular-nums">{formatoFecha(usuario.creadoEn)}</span>,
    },
    ...(puedeGestionar
      ? [
          {
            clave: 'acciones',
            titulo: 'Acciones',
            alineacion: 'derecha',
            render: (usuario) =>
              usuario.id === sesion?.id ? (
                <span className="text-detalle text-neutro-450">Tu cuenta</span>
              ) : (
                <span className="inline-flex gap-1">
                  <Boton variante="fantasma" tamano="pequeno" onClick={() => setEnEdicion(usuario)}>
                    {esRolPendiente(usuario.rol) ? 'Aprobar' : 'Cambiar rol'}
                  </Boton>
                  <Boton variante="fantasma" tamano="pequeno" onClick={() => cambioDeEstado.pedir(usuario)}>
                    {usuario.activo ? 'Desactivar' : 'Activar'}
                  </Boton>
                </span>
              ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col pb-15">
      <EncabezadoPagina
        titulo="Usuarios"
        descripcion={datos ? `${plural(datos.total, 'cuenta', 'cuentas')} · roles y acceso al panel` : 'Roles y acceso al panel'}
        acciones={
          <CampoBusqueda
            etiqueta="Buscar usuarios"
            marcador="Buscar por nombre o correo"
            valor={busqueda}
            alCambiar={cambiarFiltro(setBusqueda)}
            className="w-75 max-w-full"
          />
        }
      />

      {carga.situacion === 'cargando' && !datos ? <EstadoCarga texto="Cargando usuarios…" className="mt-6" /> : null}
      {carga.situacion === 'error' ? <EstadoError mensaje={carga.error} alReintentar={carga.recargar} className="mt-4.5" /> : null}

      {datos && carga.situacion !== 'error' ? (
        <>
          {puedeGestionar && pendientes > 0 && rol !== PENDIENTE ? (
            <Alerta tipo="advertencia" titulo={`${plural(pendientes, 'cuenta espera', 'cuentas esperan')} aprobación`} className="mt-4.5">
              <span className="flex flex-wrap items-center justify-between gap-2">
                Asígnales un rol para que puedan entrar al panel.
                <Boton variante="secundario" tamano="pequeno" onClick={() => cambiarFiltro(setRol)(PENDIENTE)}>
                  Ver pendientes
                </Boton>
              </span>
            </Alerta>
          ) : null}

          <div className="mt-4.5 flex flex-wrap items-center justify-between gap-3">
            <GrupoFiltros
              etiqueta="Filtrar por rol"
              tamano="grande"
              valor={rol}
              alCambiar={cambiarFiltro(setRol)}
              opciones={FILTROS_ROL.map((opcion) => (opcion.valor === PENDIENTE ? { ...opcion, cantidad: pendientes } : opcion))}
            />
            <SelectorCompacto etiqueta="Estado" valor={estado} alCambiar={cambiarFiltro(setEstado)} opciones={FILTROS_ESTADO} />
          </div>

          <Tarjeta
            relleno="ninguno"
            aria-busy={carga.situacion === 'cargando'}
            className={`mt-3 overflow-hidden transition-opacity duration-150 ${carga.situacion === 'cargando' ? 'opacity-60' : ''}`}
          >
            {angosta ? (
              <ListaUsuarios
                usuarios={usuarios}
                idPropio={sesion?.id}
                puedeGestionar={puedeGestionar}
                alEditarRol={setEnEdicion}
                alCambiarEstado={cambioDeEstado.pedir}
                mensajeVacio={mensajeVacio}
              />
            ) : (
              <Tabla columnas={columnas} filas={usuarios} descripcion="Cuentas del panel" mensajeVacio={mensajeVacio} enTarjeta />
            )}
            <Paginacion
              pagina={pagina}
              totalPaginas={datos.totalPaginas}
              totalElementos={datos.total}
              porPagina={datos.porPagina}
              alCambiar={setPagina}
            />
          </Tarjeta>
        </>
      ) : null}

      {enEdicion ? (
        <AsignarRol
          usuario={enEdicion}
          alCerrar={() => setEnEdicion(null)}
          alGuardar={(usuario) => {
            setEnEdicion(null);
            carga.refrescar();
            mostrarAviso(`${usuario.nombre} ahora es ${etiquetaDeRol(usuario.rol).toLowerCase()}`);
          }}
        />
      ) : null}

      <ConfirmarAccion
        abierto={enCurso !== null}
        titulo={enCurso?.activo ? `Desactivar a ${enCurso?.nombre}` : `Activar a ${enCurso?.nombre}`}
        textoConfirmar={enCurso?.activo ? 'Desactivar' : 'Activar'}
        variante={enCurso?.activo ? 'peligro' : 'primario'}
        enviando={cambioDeEstado.enviando}
        error={cambioDeEstado.error}
        alConfirmar={cambioDeEstado.confirmar}
        alCancelar={cambioDeEstado.cancelar}
      >
        {enCurso?.activo
          ? 'No podrá ingresar al panel. La cuenta y su historial se conservan.'
          : `Podrá volver a ingresar con su rol de ${etiquetaDeRol(enCurso?.rol).toLowerCase()}.`}
      </ConfirmarAccion>

      <Aviso aviso={aviso} />
    </div>
  );
}
