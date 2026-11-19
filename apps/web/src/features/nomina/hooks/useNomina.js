import { useCallback, useState } from 'react';

import { listarColaboradores } from '@/features/colaboradores';
import { obtenerQuincena } from '@/features/nomina/api/nomina.api';
import { useCarga } from '@/hooks/useCarga';

/** El día anterior a una fecha sin hora (YYYY-MM-DD), sin zona horaria. */
function diaAnterior(fecha) {
  const dia = new Date(`${fecha}T00:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() - 1);
  return dia.toISOString().slice(0, 10);
}

/**
 * Nómina de la quincena actual o de la anterior (el selector del diseño) y
 * los colaboradores para registrar descuentos. La anterior es la que
 * contiene el día previo al inicio de la actual.
 */
export function useNomina() {
  const [periodo, setPeriodo] = useState('actual');
  const [inicioActual, setInicioActual] = useState(null);
  const fecha = periodo === 'anterior' && inicioActual ? diaAnterior(inicioActual) : null;

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
