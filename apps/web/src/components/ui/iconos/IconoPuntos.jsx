/**
 * Tres puntos: abre el menú de acciones de una tarjeta.
 *
 * Es decorativo: se oculta a los lectores de pantalla.
 *
 * @param {{ className?: string }} props
 */
export function IconoPuntos({ className = 'size-3.75' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}
