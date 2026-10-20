import { useSyncExternalStore } from 'react';

/**
 * Por debajo de este ancho la barra lateral es un cajón. Debe coincidir con
 * --breakpoint-escritorio de src/styles/global.css; una prueba lo verifica.
 */
export const CONSULTA_PANTALLA_ANGOSTA = '(width < 47.5rem)';

function suscribir(avisar) {
  const lista = window.matchMedia(CONSULTA_PANTALLA_ANGOSTA);
  lista.addEventListener('change', avisar);
  return () => lista.removeEventListener('change', avisar);
}

const leer = () => window.matchMedia(CONSULTA_PANTALLA_ANGOSTA).matches;

/**
 * Indica si la ventana está por debajo del punto de quiebre escritorio, y se
 * actualiza cuando cambia (al girar el teléfono o redimensionar la ventana).
 *
 * @returns {boolean}
 */
export function usePantallaAngosta() {
  return useSyncExternalStore(suscribir, leer, () => false);
}
