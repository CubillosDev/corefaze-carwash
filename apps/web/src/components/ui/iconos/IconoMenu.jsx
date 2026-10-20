/**
 * Tres líneas, la última más corta: abre el menú de navegación.
 *
 * Es decorativo: se oculta a los lectores de pantalla y toma el color del
 * texto que lo rodea.
 *
 * @param {{ className?: string }} props
 */
export function IconoMenu({ className = 'size-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7h16M4 12h16M4 17h10" />
    </svg>
  );
}
