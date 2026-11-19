export const CURVA = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
export const CURVA_SALIDA = 'cubic-bezier(0.16, 1, 0.3, 1)';

const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');

/** @returns {boolean} La persona pidió reducir el movimiento. */
export const reducirMovimiento = () => consulta.matches;

/**
 * Anima con la Web Animations API solo si la persona no pidió reducir el
 * movimiento.
 *
 * @param {Element|null} elemento
 * @param {Keyframe[]} cuadros
 * @param {KeyframeAnimationOptions} opciones
 * @returns {Animation|null}
 */
export function animar(elemento, cuadros, opciones) {
  if (!elemento || reducirMovimiento()) return null;
  return elemento.animate(cuadros, opciones);
}

/**
 * Llama a alVer(true/false) cuando el elemento entra o sale de la pantalla.
 * Sirve para pausar animaciones que nadie está viendo.
 *
 * @param {Element} elemento
 * @param {(visible: boolean) => void} alVer
 */
export function observarVisibilidad(elemento, alVer) {
  new IntersectionObserver(([entrada]) => alVer(entrada.isIntersecting)).observe(elemento);
}
