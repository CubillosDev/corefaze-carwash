import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { CampoBusqueda } from '@/components/ui/CampoBusqueda';
import { ConfirmarAccion } from '@/components/ui/ConfirmarAccion';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { GrupoFiltros } from '@/components/ui/GrupoFiltros';
import { IconoMas } from '@/components/ui/iconos/IconoMas';
import { Paginacion } from '@/components/ui/Paginacion';
import { PanelLateral } from '@/components/ui/PanelLateral';
import { SelectorCompacto } from '@/components/ui/SelectorCompacto';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { ESTADOS_ACTIVIDAD, TIPOS_CLIENTE } from '@/constants/dominio';
import { rolPuedeGestionar } from '@/constants/permisos';
import { RUTAS } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion';
import { eliminarCliente, listarClientes } from '@/features/clientes/api/clientes.api';
import { DetalleCliente } from '@/features/clientes/components/DetalleCliente';
import { FormularioCliente } from '@/features/clientes/components/FormularioCliente';
import { ListaClientes } from '@/features/clientes/components/ListaClientes';
import { listarVehiculos, normalizarPlaca } from '@/features/vehiculos';
import { useAviso } from '@/hooks/useAviso';
import { useCarga } from '@/hooks/useCarga';
import { useConfirmacion } from '@/hooks/useConfirmacion';
import { useFilasPorPagina } from '@/hooks/useFilasPorPagina';
import { paginar } from '@/utils/paginar';

/** Segmentos del diseño, con los datos que sí tiene un cliente en la API. */
const SEGMENTOS = [
  { valor: 'todos', texto: 'Todos', cumple: () => true },
  { valor: 'particulares', texto: 'Particulares', cumple: (cliente) => cliente.tipo === TIPOS_CLIENTE.PARTICULAR },
  { valor: 'empresas', texto: 'Empresas', cumple: (cliente) => cliente.tipo === TIPOS_CLIENTE.EMPRESA },
  { valor: 'credito', texto: 'Con crédito', cumple: (cliente) => cliente.creditoHabilitado },
  { valor: 'inactivos', texto: 'Inactivos', cumple: (cliente) => cliente.estado === ESTADOS_ACTIVIDAD.INACTIVO },
];

const ORDENES = {
  nombre: { texto: 'Nombre (A–Z)', comparar: (a, b) => a.nombre.localeCompare(b.nombre, 'es') },
  nombreDesc: { texto: 'Nombre (Z–A)', comparar: (a, b) => b.nombre.localeCompare(a.nombre, 'es') },
  documento: { texto: 'Documento', comparar: (a, b) => a.documento.localeCompare(b.documento) },
};

async function cargarClientes(signal) {
  const [clientes, vehiculos] = await Promise.all([listarClientes({ signal }), listarVehiculos({ signal })]);
  return { clientes, vehiculos };
}

const minusculas = (texto) => String(texto ?? '').toLocaleLowerCase('es-CO');

/**
 * Clientes: búsqueda por nombre, documento, teléfono o placa, segmentos,
 * orden, lista paginada y detalle en panel lateral. Quien administra registra,
 * edita y elimina (la API no deja eliminar un cliente con vehículos).
 */
export function ClientesPage() {
  const { usuario } = useSesion();
  const carga = useCarga(cargarClientes);
  const { aviso, mostrarAviso } = useAviso();
  const [busqueda, setBusqueda] = useState('');
  const [segmento, setSegmento] = useState('todos');
  const [orden, setOrden] = useState('nombre');
  const [pagina, setPagina] = useState(0);
  const porPagina = useFilasPorPagina();
  const [elegidoId, setElegidoId] = useState(null);
  const [edicion, setEdicion] = useState(null);
  const puedeGestionar = rolPuedeGestionar(usuario?.rol, RUTAS.CLIENTES);

  const eliminacion = useConfirmacion({
    ejecutar: (cliente) => eliminarCliente(cliente.id),
    alTerminar: (cliente) => {
      setElegidoId(null);
      carga.actualizar((datos) => ({ ...datos, clientes: datos.clientes.filter((actual) => actual.id !== cliente.id) }));
      mostrarAviso('Cliente eliminado');
    },
  });

  const clientes = carga.datos?.clientes ?? [];
  const vehiculos = carga.datos?.vehiculos ?? [];
  const vehiculosDe = (clienteId) => vehiculos.filter((vehiculo) => vehiculo.clienteId === clienteId);

  const texto = minusculas(busqueda.trim());
  const placaBuscada = normalizarPlaca(busqueda);
  const coincide = (cliente) =>
    texto === '' ||
    minusculas(cliente.nombre).includes(texto) ||
    cliente.documento.includes(texto) ||
    cliente.telefono.includes(texto) ||
    (placaBuscada !== '' && vehiculosDe(cliente.id).some((vehiculo) => vehiculo.placa.includes(placaBuscada)));

  const encontrados = clientes.filter(coincide);
  const segmentoActual = SEGMENTOS.find((opcion) => opcion.valor === segmento);
  const filtrados = encontrados.filter(segmentoActual.cumple).sort(ORDENES[orden].comparar);
  const vista = paginar(filtrados, pagina, porPagina);
  const elegido = clientes.find((cliente) => cliente.id === elegidoId) ?? null;

  const cambiarFiltro = (cambiar) => (valor) => {
    cambiar(valor);
    setPagina(0);
  };

  return (
    <div className="flex flex-col pb-15">
      <EncabezadoPagina
        titulo="Clientes"
        descripcion={`${clientes.length} clientes registrados`}
        acciones={
          <>
            <CampoBusqueda
              etiqueta="Buscar clientes"
              marcador="Buscar por nombre, placa o teléfono"
              valor={busqueda}
              alCambiar={cambiarFiltro(setBusqueda)}
              className="w-75 max-w-full"
            />
            {puedeGestionar ? (
              <Boton className="pl-2.75 shadow-boton-primario" onClick={() => setEdicion({ cliente: null })}>
                <IconoMas className="size-3.75" />
                Nuevo cliente
              </Boton>
            ) : null}
          </>
        }
      />

      {carga.situacion === 'cargando' ? <EstadoCarga texto="Cargando clientes…" className="mt-6" /> : null}
      {carga.situacion === 'error' ? <EstadoError mensaje={carga.error} alReintentar={carga.recargar} className="mt-4.5" /> : null}

      {carga.situacion === 'listo' ? (
        <>
          <div className="mt-4.5 flex flex-wrap items-center justify-between gap-3">
            <GrupoFiltros
              etiqueta="Segmentos de clientes"
              tamano="grande"
              valor={segmento}
              alCambiar={cambiarFiltro(setSegmento)}
              opciones={SEGMENTOS.map((opcion) => ({
                valor: opcion.valor,
                texto: opcion.texto,
                cantidad: encontrados.filter(opcion.cumple).length,
              }))}
            />
            <SelectorCompacto
              etiqueta="Ordenar por"
              valor={orden}
              alCambiar={setOrden}
              opciones={Object.entries(ORDENES).map(([valor, { texto: textoOrden }]) => ({ valor, texto: textoOrden }))}
            />
          </div>

          <Tarjeta relleno="ninguno" className="mt-3 overflow-hidden">
            {filtrados.length > 0 ? (
              <ListaClientes clientes={vista.elementos} vehiculosDe={vehiculosDe} alElegir={(cliente) => setElegidoId(cliente.id)} />
            ) : (
              <EstadoVacio
                titulo="Sin resultados"
                descripcion={
                  busqueda.trim()
                    ? `No hay clientes que coincidan con «${busqueda.trim()}» en este segmento.`
                    : 'No hay clientes en este segmento.'
                }
              />
            )}
            <Paginacion
              pagina={vista.pagina}
              totalPaginas={vista.totalPaginas}
              totalElementos={filtrados.length}
              porPagina={porPagina}
              alCambiar={setPagina}
            />
          </Tarjeta>
        </>
      ) : null}

      <PanelLateral
        abierto={elegido !== null}
        alCerrar={() => setElegidoId(null)}
        titulo="Detalle del cliente"
        pie={
          puedeGestionar && elegido ? (
            <>
              <Boton variante="secundario" tamano="grande" className="flex-1" onClick={() => eliminacion.pedir(elegido)}>
                Eliminar
              </Boton>
              <Boton tamano="grande" className="flex-1" onClick={() => setEdicion({ cliente: elegido })}>
                Editar cliente
              </Boton>
            </>
          ) : null
        }
      >
        {elegido ? <DetalleCliente cliente={elegido} vehiculos={vehiculosDe(elegido.id)} /> : null}
      </PanelLateral>

      {edicion ? (
        <FormularioCliente
          cliente={edicion.cliente}
          alCerrar={() => setEdicion(null)}
          alGuardar={(cliente) => {
            setEdicion(null);
            carga.actualizar((datos) => ({
              ...datos,
              clientes: datos.clientes.some((actual) => actual.id === cliente.id)
                ? datos.clientes.map((actual) => (actual.id === cliente.id ? cliente : actual))
                : [...datos.clientes, cliente],
            }));
            mostrarAviso('Cliente guardado');
          }}
        />
      ) : null}

      <ConfirmarAccion
        abierto={eliminacion.pendiente !== null}
        titulo={`Eliminar a ${eliminacion.pendiente?.nombre ?? ''}`}
        textoConfirmar="Eliminar"
        variante="peligro"
        enviando={eliminacion.enviando}
        error={eliminacion.error}
        alConfirmar={eliminacion.confirmar}
        alCancelar={eliminacion.cancelar}
      >
        El cliente sale del registro. Si tiene vehículos, la API no lo permite: en ese caso,
        márcalo como inactivo.
      </ConfirmarAccion>

      <Aviso aviso={aviso} />
    </div>
  );
}
