import { useEffect } from 'react';

/**
 * Evita que la página de fondo se desplace mientras hay una capa encima
 * (un modal o el cajón de navegación).
 *
 * @param {boolean} activo
 */
export function useBloqueoDeScroll(activo) {
  useEffect(() => {
    if (!activo) {
      return undefined;
    }

    const desbordePrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = desbordePrevio;
    };
  }, [activo]);
}
