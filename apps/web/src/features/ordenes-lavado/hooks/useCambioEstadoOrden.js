import { useCallback, useState } from 'react';

import { ESTADOS_ORDEN } from '@/constants/dominio';
import { etiquetaEstadoOrden } from '@/constants/etiquetas';
import { cambiarEstadoOrden } from '@/features/ordenes-lavado/api/ordenesLavado.api';

/**
 * Cambia el estado de una orden con PATCH /estado. Anular pide confirmación
 * antes de enviar; los demás cambios se envían de una vez. El estado final es
 * el que devuelve la API.
 *
 * @param {object} opciones
 * @param {(orden: object) => void} opciones.alCambiar Recibe la orden que devolvió la API.
 * @param {(mensaje: string, tono?: 'exito'|'error') => void} opciones.avisar
 */
export function useCambioEstadoOrden({ alCambiar, avisar }) {
  const [ordenOcupada, setOrdenOcupada] = useState(null);
  const [porAnular, setPorAnular] = useState(null);
  const [errorAnulacion, setErrorAnulacion] = useState('');

  const enviar = useCallback(
    async (orden, estado, motivo) => {
      setOrdenOcupada(orden.id);
      try {
        const actualizada = await cambiarEstadoOrden(orden.id, { estado, motivo });
        alCambiar(actualizada);
        avisar(`Orden en ${etiquetaEstadoOrden(actualizada.estado).toLowerCase()}`);
        return true;
      } catch (error) {
        if (estado === ESTADOS_ORDEN.CANCELADA) {
          setErrorAnulacion(error.message);
        } else {
          avisar(error.message, 'error');
        }
        return false;
      } finally {
        setOrdenOcupada(null);
      }
    },
    [alCambiar, avisar],
  );

  const cambiar = useCallback(
    (orden, estado, placa) => {
      if (estado === ESTADOS_ORDEN.CANCELADA) {
        setErrorAnulacion('');
        setPorAnular({ orden, placa });
        return;
      }
      enviar(orden, estado);
    },
    [enviar],
  );

  const confirmarAnulacion = useCallback(
    async (motivo) => {
      if (porAnular && (await enviar(porAnular.orden, ESTADOS_ORDEN.CANCELADA, motivo))) {
        setPorAnular(null);
      }
    },
    [enviar, porAnular],
  );

  return {
    ordenOcupada,
    cambiar,
    porAnular: porAnular ? { placa: porAnular.placa, turno: porAnular.orden.turno } : null,
    anulando: porAnular !== null && ordenOcupada === porAnular.orden.id,
    errorAnulacion,
    confirmarAnulacion,
    cancelarAnulacion: () => setPorAnular(null),
  };
}
