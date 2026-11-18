import { useCallback, useMemo, useState } from 'react';

import { ESTADOS_JORNADA } from '@/constants/dominio';
import { listarColaboradores } from '@/features/colaboradores';
import { listarJornadas } from '@/features/jornadas';
import { listarOrdenes } from '@/features/ordenes-lavado/api/ordenesLavado.api';
import { listarServicios } from '@/features/servicios';
import { listarVehiculos } from '@/features/vehiculos';
import { useCarga } from '@/hooks/useCarga';

/** La jornada que se muestra al entrar: la abierta o, si no hay, la más reciente. */
export function jornadaPorDefecto(jornadas) {
  const abierta = jornadas.find((jornada) => jornada.estado === ESTADOS_JORNADA.ABIERTA);
  if (abierta) {
    return abierta;
  }
  return jornadas.reduce(
    (reciente, jornada) => (reciente === null || jornada.fecha > reciente.fecha ? jornada : reciente),
    null,
  );
}

const porId = (lista) => new Map(lista.map((elemento) => [elemento.id, elemento]));

async function cargarCatalogos(signal) {
  const [jornadas, vehiculos, servicios, colaboradores] = await Promise.all([
    listarJornadas({}, { signal }),
    listarVehiculos({ signal }),
    listarServicios({ signal }),
    listarColaboradores({ signal }),
  ]);
  return { jornadas, vehiculos, servicios, colaboradores };
}

const SIN_ORDENES = Object.freeze({ ordenes: [], totales: null });

/**
 * Datos de la pantalla de órdenes: las jornadas para elegir, las órdenes de la
 * jornada elegida con sus totales (calculados por el servidor) y los catálogos
 * para mostrar placa, servicio y colaborador de cada orden.
 *
 * @returns {object} Ver el objeto que retorna: situación, datos y acciones.
 */
export function useOrdenesLavado() {
  const catalogos = useCarga(cargarCatalogos);
  const [jornadaElegida, setJornadaElegida] = useState(null);

  const jornadas = useMemo(() => catalogos.datos?.jornadas ?? [], [catalogos.datos]);
  const jornada = jornadas.find((candidata) => candidata.id === jornadaElegida) ?? jornadaPorDefecto(jornadas);
  const jornadaId = jornada?.id ?? null;

  const cargarOrdenes = useCallback(
    (signal) => (jornadaId === null ? Promise.resolve(SIN_ORDENES) : listarOrdenes({ jornadaId }, { signal })),
    [jornadaId],
  );
  const ordenes = useCarga(cargarOrdenes);

  const indices = useMemo(
    () => ({
      vehiculos: porId(catalogos.datos?.vehiculos ?? []),
      servicios: porId(catalogos.datos?.servicios ?? []),
      colaboradores: porId(catalogos.datos?.colaboradores ?? []),
    }),
    [catalogos.datos],
  );

  const { recargar: recargarCatalogos } = catalogos;
  const { recargar: recargarOrdenes, actualizar } = ordenes;

  const recargar = useCallback(() => {
    recargarCatalogos();
    recargarOrdenes();
  }, [recargarCatalogos, recargarOrdenes]);

  const reemplazarOrden = useCallback(
    (orden) =>
      actualizar((datos) => ({
        ...datos,
        ordenes: datos.ordenes.map((actual) => (actual.id === orden.id ? orden : actual)),
      })),
    [actualizar],
  );

  const situacion =
    catalogos.situacion === 'error' || ordenes.situacion === 'error'
      ? 'error'
      : catalogos.situacion === 'cargando' || ordenes.situacion === 'cargando'
        ? 'cargando'
        : 'listo';

  return {
    situacion,
    error: catalogos.error || ordenes.error,
    recargar,
    recargarOrdenes,
    jornadas,
    jornada,
    elegirJornada: setJornadaElegida,
    ordenes: ordenes.datos?.ordenes ?? [],
    totales: ordenes.datos?.totales ?? null,
    servicios: catalogos.datos?.servicios ?? [],
    vehiculoDe: (id) => indices.vehiculos.get(id) ?? null,
    servicioDe: (id) => indices.servicios.get(id) ?? null,
    colaboradorDe: (id) => indices.colaboradores.get(id) ?? null,
    reemplazarOrden,
  };
}
