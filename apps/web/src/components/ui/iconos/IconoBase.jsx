/**
 * Lienzo común de los iconos de trazo del diseño (24 × 24, color del texto).
 *
 * Es decorativo: se oculta a los lectores de pantalla. Quien lo usa da el
 * nombre accesible en el control que lo contiene.
 *
 * @param {object} props
 * @param {string} [props.className] Tamaño, por ejemplo size-4.25.
 * @param {string|number} [props.grosor] Grosor del trazo.
 * @param {import('react').ReactNode} props.children Trazos del icono.
 */
export function IconoBase({ className = 'size-4.25', grosor = 1.7, children }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}
