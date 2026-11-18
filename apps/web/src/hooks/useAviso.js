import { useCallback, useEffect, useState } from 'react';

const DURACION_MS = 3200;

/**
 * Estado del aviso flotante (componente Aviso): lo muestra y lo quita solo
 * después de unos segundos. Un aviso nuevo reemplaza al anterior.
 *
 * @returns {{ aviso: { mensaje: string, tono: 'exito'|'error' } | null,
 *   mostrarAviso: (mensaje: string, tono?: 'exito'|'error') => void }}
 */
export function useAviso() {
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    if (!aviso) {
      return undefined;
    }
    const temporizador = setTimeout(() => setAviso(null), DURACION_MS);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  const mostrarAviso = useCallback((mensaje, tono = 'exito') => setAviso({ mensaje, tono }), []);

  return { aviso, mostrarAviso };
}
