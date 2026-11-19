/**
 * Automóvil visto de frente: sección de vehículos del panel.
 *
 * Es decorativo: se oculta a los lectores de pantalla y toma el color del
 * texto que lo rodea.
 *
 * @param {{ className?: string }} props
 */
export function IconoVehiculo({ className = 'size-4.25' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5.5 11 7 6.9a1.5 1.5 0 0 1 1.4-1h7.2a1.5 1.5 0 0 1 1.4 1L18.5 11" />
      <rect x="3.5" y="11" width="17" height="6" rx="1.8" />
      <circle cx="7.6" cy="14" r="0.9" />
      <circle cx="16.4" cy="14" r="0.9" />
      <path d="M6.5 17v2.2M17.5 17v2.2" />
    </svg>
  );
}
