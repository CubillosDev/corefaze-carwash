import { useCallback, useState } from 'react';

import { ESTADOS_JORNADA } from '@/constants/dominio';
import { abrirJornada, cambiarEstadoJornada } from '@/features/jornadas/api/jornadas.api';

/**
 * Abrir, cerrar y reabrir jornadas. Cerrar pide confirmación (se guarda la
 * jornada pendiente); las reglas (una sola abierta, una por día, quién puede
 * reabrir) las valida la API y su mensaje se muestra tal cual.
 *
 * @param {object} opciones
 * @param {(jornada: object) => void} opciones.alCambiar Recibe la jornada que devolvió la API.
 * @param {(mensaje: string, tono?: 'exito'|'error') => void} opciones.avisar
 */
export function useAccionesJornada({ alCambiar, avisar }) {
  const [enviando, setEnviando] = useState(false);
  const [porCerrar, setPorCerrar] = useState(null);
  const [errorCierre, setErrorCierre] = useState('');

  const ejecutar = useCallback(
    async (accion, mensajeExito, alFallar) => {
      setEnviando(true);
      try {
        const jornada = await accion();
        alCambiar(jornada);
        avisar(mensajeExito);
        return true;
      } catch (error) {
        alFallar(error.message);
        return false;
      } finally {
        setEnviando(false);
      }
    },
    [alCambiar, avisar],
  );

  const abrir = useCallback(
    () => ejecutar(abrirJornada, 'Jornada abierta', (mensaje) => avisar(mensaje, 'error')),
    [ejecutar, avisar],
  );

  const reabrir = useCallback(
    (jornada) =>
      ejecutar(
        () => cambiarEstadoJornada(jornada.id, ESTADOS_JORNADA.ABIERTA),
        'Jornada reabierta',
        (mensaje) => avisar(mensaje, 'error'),
      ),
    [ejecutar, avisar],
  );

  const confirmarCierre = useCallback(async () => {
    const cerrada = await ejecutar(
      () => cambiarEstadoJornada(porCerrar.id, ESTADOS_JORNADA.CERRADA),
      'Jornada cerrada',
      setErrorCierre,
    );
    if (cerrada) {
      setPorCerrar(null);
    }
  }, [ejecutar, porCerrar]);

  return {
    enviando,
    abrir,
    reabrir,
    porCerrar,
    errorCierre,
    pedirCierre: (jornada) => {
      setErrorCierre('');
      setPorCerrar(jornada);
    },
    cancelarCierre: () => setPorCerrar(null),
    confirmarCierre,
  };
}
