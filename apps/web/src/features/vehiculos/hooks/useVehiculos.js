import { useCallback, useEffect, useMemo, useState } from 'react';

import { listarClientes } from '@/features/clientes';
import { listarVehiculos } from '@/features/vehiculos/api/vehiculos.api';
import { normalizarPlaca } from '@/features/vehiculos/validators/vehiculo.schema';

const MENSAJE_ERROR_CARGA = 'No pudimos cargar los vehículos. Inténtalo de nuevo.';

/**
 * Datos de la pantalla de vehículos: la lista, los clientes (para mostrar el
 * dueño y para el formulario) y la búsqueda por placa.
 *
 * La API todavía no filtra por placa, así que se trae la lista completa una vez
 * y la búsqueda se resuelve aquí, sin más solicitudes mientras se escribe.
 *
 * @returns {{
 *   situacion: 'cargando'|'listo'|'error',
 *   error: string,
 *   vehiculos: import('@/features/vehiculos/api/vehiculos.api').Vehiculo[],
 *   coincidencias: import('@/features/vehiculos/api/vehiculos.api').Vehiculo[],
 *   clientes: object[],
 *   nombreDeCliente: (clienteId: number) => string,
 *   busqueda: string,
 *   buscar: (texto: string) => void,
 *   recargar: () => void,
 *   agregar: (vehiculo: object) => void,
 *   reemplazar: (vehiculo: object) => void,
 *   quitar: (id: number) => void,
 * }}
 */
export function useVehiculos() {
  const [estado, setEstado] = useState({
    situacion: 'cargando',
    error: '',
    vehiculos: [],
    clientes: [],
  });
  const [intento, setIntento] = useState(0);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const controlador = new AbortController();
    const { signal } = controlador;

    Promise.all([listarVehiculos({ signal }), listarClientes({ signal })]).then(
      ([vehiculos, clientes]) => {
        setEstado({ situacion: 'listo', error: '', vehiculos, clientes });
      },
      (error) => {
        if (signal.aborted) {
          return;
        }
        setEstado((anterior) => ({
          ...anterior,
          situacion: 'error',
          error: error?.message || MENSAJE_ERROR_CARGA,
        }));
      },
    );

    return () => controlador.abort();
  }, [intento]);

  const recargar = useCallback(() => {
    setEstado((anterior) => ({ ...anterior, situacion: 'cargando', error: '' }));
    setIntento((valor) => valor + 1);
  }, []);

  const agregar = useCallback((vehiculo) => {
    setEstado((anterior) => ({ ...anterior, vehiculos: [...anterior.vehiculos, vehiculo] }));
  }, []);

  const reemplazar = useCallback((vehiculo) => {
    setEstado((anterior) => ({
      ...anterior,
      vehiculos: anterior.vehiculos.map((actual) => (actual.id === vehiculo.id ? vehiculo : actual)),
    }));
  }, []);

  const quitar = useCallback((id) => {
    setEstado((anterior) => ({
      ...anterior,
      vehiculos: anterior.vehiculos.filter((actual) => actual.id !== id),
    }));
  }, []);

  const nombresDeClientes = useMemo(
    () => new Map(estado.clientes.map((cliente) => [cliente.id, cliente.nombre])),
    [estado.clientes],
  );
  const nombreDeCliente = useCallback(
    (clienteId) => nombresDeClientes.get(clienteId) ?? 'Cliente sin identificar',
    [nombresDeClientes],
  );

  const coincidencias = useMemo(() => {
    const termino = normalizarPlaca(busqueda);
    return termino === ''
      ? estado.vehiculos
      : estado.vehiculos.filter((vehiculo) => normalizarPlaca(vehiculo.placa).includes(termino));
  }, [estado.vehiculos, busqueda]);

  return {
    ...estado,
    coincidencias,
    nombreDeCliente,
    busqueda,
    buscar: setBusqueda,
    recargar,
    agregar,
    reemplazar,
    quitar,
  };
}
