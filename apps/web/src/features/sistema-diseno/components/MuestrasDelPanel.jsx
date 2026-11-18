import { useState } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { ConfirmarAccion } from '@/components/ui/ConfirmarAccion';
import { Dato } from '@/components/ui/Dato';
import { CampoBusqueda } from '@/components/ui/CampoBusqueda';
import { Contador } from '@/components/ui/Contador';
import { ControlSegmentado } from '@/components/ui/ControlSegmentado';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { GrupoFiltros } from '@/components/ui/GrupoFiltros';
import { IconoBuscar } from '@/components/ui/iconos/IconoBuscar';
import { IconoCatalogo } from '@/components/ui/iconos/IconoCatalogo';
import { IconoCelular } from '@/components/ui/iconos/IconoCelular';
import { IconoClientes } from '@/components/ui/iconos/IconoClientes';
import { IconoColaboradores } from '@/components/ui/iconos/IconoColaboradores';
import { IconoCredito } from '@/components/ui/iconos/IconoCredito';
import { IconoFlechaAbajo } from '@/components/ui/iconos/IconoFlechaAbajo';
import { IconoFlechaDerecha } from '@/components/ui/iconos/IconoFlechaDerecha';
import { IconoFlechaIzquierda } from '@/components/ui/iconos/IconoFlechaIzquierda';
import { IconoJornadas } from '@/components/ui/iconos/IconoJornadas';
import { IconoMas } from '@/components/ui/iconos/IconoMas';
import { IconoOrdenes } from '@/components/ui/iconos/IconoOrdenes';
import { IconoPerfil } from '@/components/ui/iconos/IconoPerfil';
import { IconoPuntos } from '@/components/ui/iconos/IconoPuntos';
import { IconoReportes } from '@/components/ui/iconos/IconoReportes';
import { IconoUsuarios } from '@/components/ui/iconos/IconoUsuarios';
import { IconoVisto } from '@/components/ui/iconos/IconoVisto';
import { Indicador } from '@/components/ui/Indicador';
import { Insignia } from '@/components/ui/Insignia';
import { Paginacion } from '@/components/ui/Paginacion';
import { PanelLateral } from '@/components/ui/PanelLateral';
import { Placa } from '@/components/ui/Placa';
import { Punto } from '@/components/ui/Punto';
import { SelectorCompacto } from '@/components/ui/SelectorCompacto';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { SeccionDelCatalogo } from '@/features/sistema-diseno/components/SeccionDelCatalogo';
import { useAviso } from '@/hooks/useAviso';

const ICONOS = [
  ['IconoOrdenes', IconoOrdenes],
  ['IconoClientes', IconoClientes],
  ['IconoCredito', IconoCredito],
  ['IconoColaboradores', IconoColaboradores],
  ['IconoCatalogo', IconoCatalogo],
  ['IconoJornadas', IconoJornadas],
  ['IconoUsuarios', IconoUsuarios],
  ['IconoReportes', IconoReportes],
  ['IconoPerfil', IconoPerfil],
  ['IconoBuscar', IconoBuscar],
  ['IconoMas', IconoMas],
  ['IconoVisto', IconoVisto],
  ['IconoCelular', IconoCelular],
  ['IconoPuntos', IconoPuntos],
  ['IconoFlechaIzquierda', IconoFlechaIzquierda],
  ['IconoFlechaDerecha', IconoFlechaDerecha],
  ['IconoFlechaAbajo', IconoFlechaAbajo],
];

const VISTAS = [
  { valor: 'tablero', texto: 'Tablero' },
  { valor: 'lista', texto: 'Lista' },
];

const FILTROS = [
  { valor: 'todas', texto: 'Todas', cantidad: 8 },
  { valor: 'registrada', texto: 'Registradas', cantidad: 3 },
  { valor: 'en_proceso', texto: 'En proceso', cantidad: 5 },
];

/**
 * Componentes que componen las pantallas del panel (encabezados, filtros,
 * insignias, estados vacío, de carga y de error, panel lateral y aviso), con
 * datos ficticios.
 */
export function MuestrasDelPanel() {
  const [vista, setVista] = useState('tablero');
  const [filtro, setFiltro] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(0);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [confirmacionAbierta, setConfirmacionAbierta] = useState(false);
  const [jornada, setJornada] = useState('2');
  const { aviso, mostrarAviso } = useAviso();

  return (
    <>
      <SeccionDelCatalogo
        titulo="Iconos"
        descripcion="Trazos copiados del diseño sobre IconoBase (24 × 24, color del texto, ocultos a lectores de pantalla)."
      >
        <ul className="grid grid-cols-2 gap-2 escritorio:grid-cols-4">
          {ICONOS.map(([nombre, Icono]) => (
            <li key={nombre} className="flex items-center gap-2.5 text-meta text-neutro-700">
              <Icono className="size-4.25 shrink-0 text-neutro-900" />
              {nombre}
            </li>
          ))}
        </ul>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Encabezado de página"
        descripcion="Título de 20 px, línea de apoyo y acciones a la derecha; el botón principal lleva la sombra azul."
      >
        <EncabezadoPagina
          titulo="Órdenes de lavado"
          descripcion="Tablero en vivo · 8 vehículos en patio"
          acciones={
            <>
              <ControlSegmentado etiqueta="Vista" opciones={VISTAS} valor={vista} alCambiar={setVista} />
              <Boton className="pl-2.75 shadow-boton-primario">
                <IconoMas className="size-3.75" />
                Nueva orden
              </Boton>
            </>
          }
        />
      </SeccionDelCatalogo>

      <SeccionDelCatalogo titulo="Filtros y búsqueda">
        <div className="flex flex-col gap-3">
          <GrupoFiltros etiqueta="Filtrar por estado" opciones={FILTROS} valor={filtro} alCambiar={setFiltro} />
          <GrupoFiltros
            etiqueta="Filtrar clientes"
            tamano="grande"
            opciones={FILTROS}
            valor={filtro}
            alCambiar={setFiltro}
          />
          <CampoBusqueda
            etiqueta="Buscar clientes"
            marcador="Buscar por nombre, documento o teléfono"
            valor={busqueda}
            alCambiar={setBusqueda}
            className="max-w-75"
          />
          <CampoBusqueda
            etiqueta="Buscar servicio"
            variante="suave"
            marcador="Buscar por nombre o número"
            valor={busqueda}
            alCambiar={setBusqueda}
            className="max-w-75"
          />
          <SelectorCompacto
            etiqueta="Jornada"
            valor={jornada}
            alCambiar={setJornada}
            opciones={[
              { valor: '2', texto: '04/08/2026 · Abierta' },
              { valor: '1', texto: '03/08/2026 · Cerrada' },
            ]}
          />
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Insignias, contadores, placas y avatares"
        descripcion="El texto de las insignias usa el tono oscuro de cada estado para cumplir contraste AA."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Insignia tono="advertencia">Registrada</Insignia>
          <Insignia tono="primario">En proceso</Insignia>
          <Insignia tono="exito">Terminada</Insignia>
          <Insignia tono="neutro">Entregada</Insignia>
          <Insignia tono="error">Cancelada</Insignia>
          <Punto tono="advertencia" />
          <Punto tono="primario" tamano="grande" />
          <Contador>3</Contador>
          <Contador tono="primario">5</Contador>
          <Placa placa="AAA111" />
          <Placa placa="BBB22B" tamano="pequeno" />
          <Avatar nombre="Ana Prueba" />
          <Avatar nombre="401" textoLiteral tamano="pequeno" tono="neutro" />
          <Avatar nombre="402" textoLiteral tamano="compacto" tono="neutro" />
          <Avatar nombre="Ana Prueba" tamano="grande" />
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo titulo="Indicadores y tarjetas">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(130px,100%),1fr))] gap-3">
          <Indicador etiqueta="Ingresos de la jornada" valor="$ 280.000" apoyo="Calculado por el servidor" />
          <Indicador etiqueta="En patio" valor="5" nota="2 terminadas" atencion apoyo="Registradas y en proceso" />
          <Tarjeta>
            <p className="text-titulo-tarjeta">Tarjeta</p>
            <p className="mt-1 text-detalle text-neutro-600">Superficie base de las pantallas.</p>
            <dl className="mt-3 grid grid-cols-2 gap-2">
              <Dato etiqueta="Apertura">7:00 a. m.</Dato>
              <Dato etiqueta="Servicios">3</Dato>
            </dl>
          </Tarjeta>
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Estados vacío, de carga y de error"
        descripcion="Toda pantalla con datos los tiene. El error siempre ofrece reintentar."
      >
        <div className="grid gap-3 escritorio:grid-cols-2">
          <Tarjeta relleno="ninguno">
            <EstadoVacio
              titulo="Disponible próximamente"
              descripcion="La API todavía no ofrece esta información."
              icono={<IconoReportes className="size-5" />}
            />
          </Tarjeta>
          <Tarjeta className="flex flex-col gap-3">
            <EstadoVacio variante="punteado" titulo="Sin vehículos" className="min-h-22.5" />
            <EstadoVacio variante="punteado" titulo="Todo en orden" />
          </Tarjeta>
          <Tarjeta relleno="ninguno">
            <EstadoCarga texto="Cargando órdenes…" />
          </Tarjeta>
          <Tarjeta>
            <EstadoError mensaje="No pudimos comunicarnos con el servidor." alReintentar={() => {}} />
          </Tarjeta>
        </div>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo titulo="Paginación">
        <Tarjeta relleno="ninguno" className="overflow-hidden">
          <Paginacion pagina={pagina} totalPaginas={12} totalElementos={118} porPagina={10} alCambiar={setPagina} />
        </Tarjeta>
      </SeccionDelCatalogo>

      <SeccionDelCatalogo
        titulo="Panel lateral, aviso y confirmación"
        descripcion="El panel entra por la derecha (400 px; todo el ancho en móvil). El aviso confirma una acción y desaparece solo. La confirmación va antes de cerrar, eliminar o desactivar."
      >
        <div className="flex flex-wrap gap-2">
          <Boton variante="secundario" onClick={() => setPanelAbierto(true)}>
            Abrir el panel
          </Boton>
          <Boton variante="secundario" onClick={() => mostrarAviso('Orden registrada')}>
            Mostrar un aviso
          </Boton>
          <Boton variante="secundario" onClick={() => setConfirmacionAbierta(true)}>
            Pedir confirmación
          </Boton>
        </div>

        <ConfirmarAccion
          abierto={confirmacionAbierta}
          titulo="Cerrar la jornada del 04/08/2026"
          textoConfirmar="Cerrar jornada"
          alConfirmar={() => setConfirmacionAbierta(false)}
          alCancelar={() => setConfirmacionAbierta(false)}
        >
          Después de cerrarla no se registran más órdenes en ella.
        </ConfirmarAccion>

        <PanelLateral
          abierto={panelAbierto}
          alCerrar={() => setPanelAbierto(false)}
          titulo="Detalle del cliente"
          pie={
            <Boton variante="secundario" tamano="grande" className="flex-1" onClick={() => setPanelAbierto(false)}>
              Cerrar
            </Boton>
          }
        >
          <div className="flex items-center gap-3.5">
            <Avatar nombre="Ana Prueba" tamano="grande" />
            <div>
              <p className="text-titulo-cajon">Ana Prueba</p>
              <p className="text-detalle text-neutro-550">300 000 0000</p>
            </div>
          </div>
        </PanelLateral>
        <Aviso aviso={aviso} />
      </SeccionDelCatalogo>
    </>
  );
}
