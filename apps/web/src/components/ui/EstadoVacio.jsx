/**
 * Mensaje para cuando no hay nada que mostrar.
 *
 * - `punteado`: recuadro con borde discontinuo (columna sin vehículos, "Todo
 *   en orden").
 * - `simple`: título y descripción centrados, sin borde (búsqueda sin
 *   resultados).
 *
 * @param {object} props
 * @param {string} props.titulo
 * @param {import('react').ReactNode} [props.descripcion]
 * @param {import('react').ReactNode} [props.icono]
 * @param {import('react').ReactNode} [props.accion]
 * @param {'punteado'|'simple'} [props.variante]
 * @param {string} [props.className]
 */
export function EstadoVacio({
  titulo,
  descripcion,
  icono,
  accion,
  variante = 'simple',
  className = '',
}) {
  if (variante === 'punteado') {
    return (
      <div
        className={`flex items-center justify-center rounded-bloque border-[1.5px] border-dashed border-neutro-325 p-4.5 text-center text-detalle text-neutro-450 ${className}`}
      >
        {titulo}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center px-5 py-10 text-center ${className}`}>
      {icono ? (
        <span className="mb-3 inline-flex size-10 items-center justify-center rounded-bloque bg-primario-100 text-primario">
          {icono}
        </span>
      ) : null}
      <p className="text-titulo-tarjeta text-neutro-900">{titulo}</p>
      {descripcion ? (
        <p className="mt-1 max-w-md text-detalle text-pretty text-neutro-450">{descripcion}</p>
      ) : null}
      {accion ? <div className="mt-4">{accion}</div> : null}
    </div>
  );
}
