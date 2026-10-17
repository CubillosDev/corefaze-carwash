/**
 * Visto dentro de un círculo: operación exitosa.
 *
 * Es decorativo: se oculta a los lectores de pantalla y toma el color del
 * texto que lo rodea.
 *
 * @param {{ className?: string }} props
 */
export function IconoExito({ className = 'size-5' }) {
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
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
    </svg>
  );
}
