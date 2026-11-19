import { useState } from 'react';

import { Aviso } from '@/components/ui/Aviso';
import { Boton } from '@/components/ui/Boton';
import { ControlSegmentado } from '@/components/ui/ControlSegmentado';
import { EncabezadoPagina } from '@/components/ui/EncabezadoPagina';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { IconoInventario } from '@/components/ui/iconos/IconoInventario';
import { IconoMas } from '@/components/ui/iconos/IconoMas';
import { PanelLateral } from '@/components/ui/PanelLateral';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { rolPuedeGestionar, rolPuedeMoverInventario } from '@/constants/permisos';
import { RUTAS } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion';
import {
  actualizarInsumo,
  cambiarEstadoInsumo,
  crearInsumo,
  listarInsumos,
  moverInsumo,
} from '@/features/inventario/api/inventario.api';
import { DetalleInsumo } from '@/features/inventario/components/DetalleInsumo';
import { FormularioInsumo } from '@/features/inventario/components/FormularioInsumo';
import { TarjetaInsumo } from '@/features/inventario/components/TarjetaInsumo';
import { useAviso } from '@/hooks/useAviso';
import { useCarga } from '@/hooks/useCarga';
import { plural } from '@/utils/plural';

const cargarInsumos = (signal) => listarInsumos({ signal });
const MENSAJE_POR_DEFECTO = 'No pudimos completar la operación. Inténtalo de nuevo.';

const FILTROS = {
  todos: (insumo) => insumo.estado === 'activo',
  bajo: (insumo) => insumo.estado === 'activo' && insumo.stockBajo,
  inactivos: (insumo) => insumo.estado !== 'activo',
};

/**
 * Inventario del diseño: los insumos en tarjetas con su stock, el aviso de
 * stock bajo (lo decide el servidor) y los botones − y + para registrar
 * salidas y entradas. Quien administra crea, edita y desactiva insumos; cada
 * insumo muestra sus últimos movimientos.
 */
export function InventarioPage() {
  const { usuario } = useSesion();
  const carga = useCarga(cargarInsumos);
  const { aviso, mostrarAviso } = useAviso();
  const [filtro, setFiltro] = useState('todos');
  const [moviendoId, setMoviendoId] = useState(null);
  const [elegidoId, setElegidoId] = useState(null);
  const [edicion, setEdicion] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const puedeGestionar = rolPuedeGestionar(usuario?.rol, RUTAS.INVENTARIO);
  const puedeMover = rolPuedeMoverInventario(usuario?.rol);
  const insumos = carga.datos ?? [];
  const bajos = insumos.filter(FILTROS.bajo).length;
  const visibles = insumos.filter(FILTROS[filtro]);
  const elegido = insumos.find((insumo) => insumo.id === elegidoId) ?? null;

  const reemplazar = (actualizado) =>
    carga.actualizar((lista) => lista.map((insumo) => (insumo.id === actualizado.id ? actualizado : insumo)));

  async function mover(insumo, cantidad) {
    setMoviendoId(insumo.id);
    try {
      reemplazar(await moverInsumo(insumo.id, cantidad));
    } catch (fallo) {
      mostrarAviso(fallo.message || MENSAJE_POR_DEFECTO, 'error');
    } finally {
      setMoviendoId(null);
    }
  }

  async function guardar(datos) {
    setEnviando(true);
    setError('');
    try {
      if (edicion.insumo) {
        reemplazar(await actualizarInsumo(edicion.insumo.id, datos));
        mostrarAviso('Insumo actualizado');
      } else {
        const creado = await crearInsumo(datos);
        carga.actualizar((lista) => [...lista, creado]);
        mostrarAviso('Insumo creado');
      }
      setEdicion(null);
    } catch (fallo) {
      setError(fallo.message || MENSAJE_POR_DEFECTO);
    } finally {
      setEnviando(false);
    }
  }

  async function alternarEstado(insumo) {
    try {
      reemplazar(await cambiarEstadoInsumo(insumo.id, insumo.estado === 'activo' ? 'inactivo' : 'activo'));
      mostrarAviso(insumo.estado === 'activo' ? 'Insumo desactivado' : 'Insumo activado');
    } catch (fallo) {
      mostrarAviso(fallo.message || MENSAJE_POR_DEFECTO, 'error');
    }
  }

  const opciones = [
    { valor: 'todos', texto: 'Todos' },
    { valor: 'bajo', texto: `Stock bajo ${bajos}` },
    ...(puedeGestionar ? [{ valor: 'inactivos', texto: 'Inactivos' }] : []),
  ];

  return (
    <div className="flex flex-col pb-15">
      <EncabezadoPagina
        titulo="Inventario"
        descripcion={`Insumos de lavado · ${plural(bajos, 'con stock bajo', 'con stock bajo')}`}
        acciones={
          <>
            <ControlSegmentado etiqueta="Filtrar insumos" opciones={opciones} valor={filtro} alCambiar={setFiltro} />
            {puedeGestionar ? (
              <Boton className="pl-2.75 shadow-boton-primario" onClick={() => setEdicion({ insumo: null })}>
                <IconoMas className="size-3.75" />
                Nuevo insumo
              </Boton>
            ) : null}
          </>
        }
      />

      {carga.situacion === 'cargando' ? <EstadoCarga texto="Cargando el inventario…" className="mt-6" /> : null}
      {carga.situacion === 'error' ? (
        <EstadoError mensaje={carga.error} alReintentar={carga.recargar} className="mt-4.5" />
      ) : null}

      {carga.situacion === 'listo' && visibles.length === 0 ? (
        <Tarjeta relleno="ninguno" className="mt-5">
          <EstadoVacio
            icono={<IconoInventario className="size-5" />}
            titulo={insumos.length === 0 ? 'Aún no hay insumos' : 'Nada en este filtro'}
            descripcion={
              insumos.length === 0
                ? 'Registra los insumos del lavadero para llevar su stock.'
                : 'Ningún insumo cumple este filtro.'
            }
          />
        </Tarjeta>
      ) : null}

      {carga.situacion === 'listo' && visibles.length > 0 ? (
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(230px,100%),1fr))] gap-3">
          {visibles.map((insumo) => (
            <TarjetaInsumo
              key={insumo.id}
              insumo={insumo}
              puedeMover={puedeMover}
              moviendo={moviendoId === insumo.id}
              alMover={(cantidad) => mover(insumo, cantidad)}
              alAbrir={() => setElegidoId(insumo.id)}
            />
          ))}
        </div>
      ) : null}

      <PanelLateral
        abierto={elegido !== null}
        alCerrar={() => setElegidoId(null)}
        titulo="Detalle del insumo"
        pie={
          puedeGestionar && elegido ? (
            <>
              <Boton variante="secundario" tamano="grande" className="flex-1" onClick={() => alternarEstado(elegido)}>
                {elegido.estado === 'activo' ? 'Desactivar' : 'Activar'}
              </Boton>
              <Boton tamano="grande" className="flex-1" onClick={() => setEdicion({ insumo: elegido })}>
                Editar insumo
              </Boton>
            </>
          ) : null
        }
      >
        {elegido ? <DetalleInsumo key={`${elegido.id}-${elegido.stock}`} insumo={elegido} /> : null}
      </PanelLateral>

      {edicion ? (
        <FormularioInsumo
          insumo={edicion.insumo}
          enviando={enviando}
          error={error}
          alGuardar={guardar}
          alCerrar={() => {
            setEdicion(null);
            setError('');
          }}
        />
      ) : null}

      <Aviso aviso={aviso} />
    </div>
  );
}
