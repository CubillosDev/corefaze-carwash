/**
 * Encabezado de una página del panel: título, línea de apoyo y, a la derecha,
 * las acciones principales. En pantallas angostas las acciones bajan.
 *
 * @param {object} props
 * @param {string} props.titulo
 * @param {import('react').ReactNode} [props.descripcion]
 * @param {import('react').ReactNode} [props.acciones]
 */
export function EncabezadoPagina({ titulo, descripcion, acciones }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-titulo text-neutro-900">{titulo}</h1>
        {descripcion ? <p className="mt-0.75 text-detalle text-neutro-600">{descripcion}</p> : null}
      </div>
      {acciones ? <div className="flex flex-wrap items-center gap-2.5">{acciones}</div> : null}
    </div>
  );
}
