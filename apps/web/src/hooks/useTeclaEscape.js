import { useEffect } from 'react';

/**
 * Ejecuta `alPresionar` cuando se oprime la tecla Escape, mientras `activo`
 * sea verdadero.
 *
 * `alPresionar` entra en las dependencias del efecto: conviene envolverla en
 * useCallback para no volver a suscribirse en cada render.
 *
 * @param {boolean} activo
 * @param {() => void} alPresionar
 */
export function useTeclaEscape(activo, alPresionar) {
  useEffect(() => {
    if (!activo) {
      return undefined;
    }

    function manejarTecla(evento) {
      if (evento.key === 'Escape') {
        alPresionar();
      }
    }

    document.addEventListener('keydown', manejarTecla);
    return () => {
      document.removeEventListener('keydown', manejarTecla);
    };
  }, [activo, alPresionar]);
}
