import { useCallback, useState } from 'react';

import { listarEmpresasCredito, listarOrdenesEmpresa } from '@/features/credito/api/credito.api';
import { useCarga } from '@/hooks/useCarga';

const cargarEmpresas = (signal) => listarEmpresasCredito({ signal });

/**
 * Empresas con crédito y los servicios (pendientes y pagados) de la empresa
 * elegida; por defecto, la primera de la lista. `refrescar` vuelve a pedir
 * ambas cosas sin pasar por "cargando", después de verificar o pagar.
 */
export function useCredito() {
  const empresas = useCarga(cargarEmpresas);
  const [elegidaId, setElegidaId] = useState(null);
  const lista = empresas.datos ?? [];
  const elegida = lista.find((empresa) => empresa.id === elegidaId) ?? lista[0] ?? null;
  const idElegida = elegida?.id ?? null;

  const cargarServicios = useCallback(
    async (signal) => {
      if (!idElegida) {
        return { pendientes: [], pagadas: [] };
      }
      const [pendientes, pagadas] = await Promise.all([
        listarOrdenesEmpresa(idElegida, 'pendientes', { signal }),
        listarOrdenesEmpresa(idElegida, 'pagadas', { signal }),
      ]);
      return { pendientes, pagadas };
    },
    [idElegida],
  );
  const servicios = useCarga(cargarServicios);

  const { refrescar: refrescarEmpresas } = empresas;
  const { refrescar: refrescarServicios } = servicios;
  const refrescar = useCallback(() => {
    refrescarEmpresas();
    refrescarServicios();
  }, [refrescarEmpresas, refrescarServicios]);

  return { empresas, servicios, elegida, elegir: setElegidaId, refrescar };
}
