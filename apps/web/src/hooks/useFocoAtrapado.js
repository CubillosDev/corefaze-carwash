import { useEffect } from 'react';

const SELECTOR_ENFOCABLES = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Atrapa el foco dentro de un contenedor mientras está activo.
 *
 * Al activarse lleva el foco al primer elemento enfocable, hace que Tab y
 * Shift+Tab den la vuelta dentro del contenedor, y al desactivarse devuelve el
 * foco al elemento que lo tenía antes (normalmente el botón que abrió la capa).
 *
 * @param {import('react').RefObject<HTMLElement>} referencia Contenedor de la capa.
 * @param {boolean} activo
 */
export function useFocoAtrapado(referencia, activo) {
  useEffect(() => {
    const contenedor = referencia.current;
    if (!activo || contenedor === null) {
      return undefined;
    }

    const elementoPrevio = document.activeElement;

    const enfocables = () => Array.from(contenedor.querySelectorAll(SELECTOR_ENFOCABLES));

    const primeroDeLaCapa = enfocables()[0];
    (primeroDeLaCapa ?? contenedor).focus();

    function manejarTabulacion(evento) {
      if (evento.key !== 'Tab') {
        return;
      }

      const lista = enfocables();
      if (lista.length === 0) {
        evento.preventDefault();
        return;
      }

      const primero = lista[0];
      const ultimo = lista[lista.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener('keydown', manejarTabulacion, true);

    return () => {
      document.removeEventListener('keydown', manejarTabulacion, true);
      if (elementoPrevio instanceof HTMLElement) {
        elementoPrevio.focus();
      }
    };
  }, [referencia, activo]);
}
