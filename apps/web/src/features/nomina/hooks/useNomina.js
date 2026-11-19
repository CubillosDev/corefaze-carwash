import { useCallback, useState } from 'react';

import { listarColaboradores } from '@/features/colaboradores';
import { obtenerQuincena } from '@/features/nomina/api/nomina.api';
import { useCarga } from '@/hooks/useCarga';
import { sumarDias } from '@/utils/aritmeticaFechas';

/**
 * Nómina de la quincena actual o de la anterior (el selector del diseño) y
 * los colaboradores para registrar descuentos. La anterior es la que
 * contiene el día previo al inicio de la actual.
 */
export function useNomina() {
  const [periodo, setPeriodo] = useState('actual');
  const [inicioActual, setInicioActual] = useState(null);
  const fecha = periodo === 'anterior' && inicioActual ? sumarDias(inicioActual, -1) : null;

  const cargar = useCallback(
    async (signal) => {
      const [quincena, colaboradores] = await Promise.all([
        obtenerQuincena(fecha, { signal }),
        listarColaboradores({ signal }),
      ]);
      if (!fecha) {
        setInicioActual(quincena.periodo.inicio);
      }
      return { quincena, colaboradores };
    },
    [fecha],
  );
  const carga = useCarga(cargar);

  return { ...carga, periodo, elegirPeriodo: setPeriodo, hayAnterior: inicioActual !== null };
}
