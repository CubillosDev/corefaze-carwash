import { useCallback, useState } from 'react';

import { listarColaboradores } from '@/features/colaboradores';
import { obtenerLiquidacion, obtenerResumenQuincena } from '@/features/nomina/api/nomina.api';
import { useCarga } from '@/hooks/useCarga';
import { fechaEnBogota } from '@/utils/formatoFecha';
import { quincenaAnterior, quincenaDe } from '@/utils/quincena';

/**
 * Nómina de la quincena actual o de la anterior (el selector del diseño), la
 * liquidación si ya se pagó y los colaboradores para registrar descuentos.
 */
export function useNomina() {
  const [periodo, setPeriodo] = useState('actual');
  const actual = quincenaDe(fechaEnBogota());
  const { inicio, fin } = periodo === 'anterior' ? quincenaAnterior(actual) : actual;

  const cargar = useCallback(
    async (signal) => {
      const [quincena, colaboradores] = await Promise.all([
        obtenerResumenQuincena({ inicio, fin }, { signal }),
        listarColaboradores({ signal }),
      ]);
      const liquidacion = quincena.liquidacionId ? await obtenerLiquidacion(quincena.liquidacionId, { signal }) : null;
      return { quincena, liquidacion, colaboradores };
    },
    [inicio, fin],
  );
  const carga = useCarga(cargar);

  return { ...carga, periodo, elegirPeriodo: setPeriodo };
}
