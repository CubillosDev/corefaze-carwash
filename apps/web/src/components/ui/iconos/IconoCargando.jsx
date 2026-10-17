/**
 * Círculo que gira: indica que una acción está en proceso.
 *
 * Es decorativo: quien usa lector de pantalla se entera por el aria-busy del
 * elemento que lo contiene.
 *
 * @param {{ className?: string }} props
 */
export function IconoCargando({ className = 'size-4' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
