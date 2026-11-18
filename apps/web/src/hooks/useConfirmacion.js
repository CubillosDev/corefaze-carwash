import { useState } from 'react';

/**
 * Acción que pide confirmación antes de ejecutarse (eliminar, desactivar):
 * guarda el registro pendiente, ejecuta la llamada a la API al confirmar y, si
 * falla, deja el mensaje para mostrarlo sin cerrar la confirmación.
 *
 * @template T
 * @param {object} opciones
 * @param {(registro: T) => Promise<unknown>} opciones.ejecutar
 * @param {(registro: T, resultado: unknown) => void} opciones.alTerminar
 */
export function useConfirmacion({ ejecutar, alTerminar }) {
  const [pendiente, setPendiente] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function confirmar() {
    setEnviando(true);
    setError('');
    try {
      const resultado = await ejecutar(pendiente);
      alTerminar(pendiente, resultado);
      setPendiente(null);
    } catch (fallo) {
      setError(fallo.message);
    } finally {
      setEnviando(false);
    }
  }

  return {
    pendiente,
    enviando,
    error,
    pedir: (registro) => {
      setError('');
      setPendiente(registro);
    },
    cancelar: () => setPendiente(null),
    confirmar,
  };
}
