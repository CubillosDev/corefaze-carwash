import { useCallback, useEffect, useState } from 'react';

import { listarOrdenesDeVehiculo } from '@/features/ordenes-lavado';
import { listarServicios } from '@/features/servicios';

const MENSAJE_ERROR = 'No pudimos cargar el historial. Inténtalo de nuevo.';

/**
 * Historial de lavados de un vehículo: sus órdenes, de la más reciente a la
 * más antigua, con el nombre del servicio de cada una.
 *
 * @param {number} vehiculoId
 * @returns {{
 *   situacion: 'cargando'|'listo'|'error',
 *   error: string,
 *   ordenes: Array<object & { servicioNombre: string }>,
 *   recargar: () => void,
 * }}
 */
export function useHistorialVehiculo(vehiculoId) {
  const [estado, setEstado] = useState({ situacion: 'cargando', error: '', ordenes: [] });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    const { signal } = controlador;

    Promise.all([listarOrdenesDeVehiculo(vehiculoId, { signal }), listarServicios({ signal })]).then(
      ([ordenes, servicios]) => {
        const nombres = new Map(servicios.map((servicio) => [servicio.id, servicio.nombre]));
        const recientesPrimero = [...ordenes]
          .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.turno - a.turno)
          .map((orden) => ({
            ...orden,
            servicioNombre: nombres.get(orden.servicioId) ?? `Servicio ${orden.servicioId}`,
          }));
        setEstado({ situacion: 'listo', error: '', ordenes: recientesPrimero });
      },
      (error) => {
        if (!signal.aborted) {
          setEstado({ situacion: 'error', error: error?.message || MENSAJE_ERROR, ordenes: [] });
        }
      },
    );

    return () => controlador.abort();
  }, [vehiculoId, intento]);

  const recargar = useCallback(() => {
    setEstado({ situacion: 'cargando', error: '', ordenes: [] });
    setIntento((valor) => valor + 1);
  }, []);

  return { ...estado, recargar };
}
