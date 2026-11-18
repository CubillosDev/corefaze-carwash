/**
 * Dato destacado dentro de una lista de descripción (<dl>): etiqueta pequeña
 * y valor en 14 px sobre un bloque gris, como las cifras del panel de detalle
 * y del panel de jornada del diseño.
 *
 * @param {object} props
 * @param {string} props.etiqueta
 * @param {boolean} [props.ancho] Ocupa las dos columnas de la cuadrícula.
 * @param {import('react').ReactNode} props.children
 */
export function Dato({ etiqueta, ancho = false, children }) {
  return (
    <div className={`min-w-0 rounded-bloque bg-neutro-75 px-3 py-2.5 ${ancho ? 'col-span-2' : ''}`}>
      <dt className="text-nota text-neutro-600">{etiqueta}</dt>
      <dd className="mt-0.5 text-titulo-tarjeta break-words tabular-nums">{children}</dd>
    </div>
  );
}
