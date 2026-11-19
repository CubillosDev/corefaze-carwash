/**
 * Bloque con título del catálogo del sistema de diseño.
 *
 * @param {object} props
 * @param {string} props.titulo
 * @param {string} [props.descripcion]
 * @param {import('react').ReactNode} props.children
 */
export function SeccionDelCatalogo({ titulo, descripcion, children }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-titulo-tarjeta text-neutro-900">{titulo}</h2>
        {descripcion ? <p className="mt-1 text-detalle text-neutro-600">{descripcion}</p> : null}
      </div>
      <div className="rounded-tarjeta border border-neutro-200 bg-white p-5">{children}</div>
    </section>
  );
}
