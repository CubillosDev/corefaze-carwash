/**
 * Paleta de pintor: catálogo del sistema de diseño.
 *
 * Es decorativo: se oculta a los lectores de pantalla y toma el color del
 * texto que lo rodea.
 *
 * @param {{ className?: string }} props
 */
export function IconoPaleta({ className = 'size-4.25' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3.2a8.8 8.8 0 1 0 0 17.6c1.2 0 1.9-.8 1.9-1.8 0-.5-.2-.9-.5-1.2-.3-.4-.5-.7-.5-1.2 0-1 .8-1.8 1.9-1.8h1.4a4.6 4.6 0 0 0 4.6-4.6C20.8 6.3 16.9 3.2 12 3.2Z" />
      <path d="M7.8 11.2h.01M11 8.2h.01M15.2 9.2h.01" />
    </svg>
  );
}
