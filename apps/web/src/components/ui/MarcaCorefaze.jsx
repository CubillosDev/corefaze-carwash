/**
 * Ícono de Corefaze (el cubo isométrico abierto del logo) en vectores, con el
 * color del texto. Sirve donde el logo completo no cabe o va sobre un fondo
 * claro, porque el archivo del logo es blanco.
 *
 * @param {object} props
 * @param {string} [props.className] Tamaño y color, por ejemplo "size-5 text-white".
 * @param {string} [props.titulo] Si se da, el ícono tiene nombre accesible; si no, es decorativo.
 */
export function MarcaCorefaze({ className = 'size-5', titulo }) {
  return (
    <svg
      className={className}
      viewBox="0 0 77 85"
      fill="currentColor"
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
      focusable="false"
    >
      <path d="M49.5 1 75.5 14.5 49.5 28 23.5 14.5z" />
      <path d="M49.5 57 75.5 70.5 49.5 84 23.5 70.5z" />
      <path d="M1 28.5 17.5 20v47.5L1 59.5z" />
    </svg>
  );
}
