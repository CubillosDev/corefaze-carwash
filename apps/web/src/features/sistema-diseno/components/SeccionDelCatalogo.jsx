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
        <h2 className="text-xl font-semibold text-neutro-900">{titulo}</h2>
        {descripcion ? <p className="mt-1 text-sm text-neutro-600">{descripcion}</p> : null}
      </div>
      <div className="rounded-xl border border-neutro-200 bg-white p-5">{children}</div>
    </section>
  );
}
