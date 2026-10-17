/**
 * Casa: sección de inicio del panel.
 *
 * Es decorativo: se oculta a los lectores de pantalla y toma el color del
 * texto que lo rodea.
 *
 * @param {{ className?: string }} props
 */
export function IconoInicio({ className = 'size-5' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.8V19a1 1 0 0 0 1 1h3.5v-4.5h3V20H17a1 1 0 0 0 1-1V9.8" />
    </svg>
  );
}
