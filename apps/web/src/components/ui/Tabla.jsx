const ALINEACIONES = {
  izquierda: 'text-left',
  centro: 'text-center',
  derecha: 'text-right',
};

function claseDeAlineacion(columna) {
  return ALINEACIONES[columna.alineacion] ?? ALINEACIONES.izquierda;
}

/**
 * @typedef {object} Columna
 * @property {string} clave Llave del dato dentro de la fila.
 * @property {string} titulo Encabezado visible de la columna.
 * @property {'izquierda'|'centro'|'derecha'} [alineacion]
 * @property {(fila: object) => import('react').ReactNode} [render] Contenido a la medida.
 */

/**
 * Tabla de datos del sistema de diseño.
 *
 * En pantallas angostas la tabla no encoge: se desplaza de lado dentro de su
 * contenedor, de modo que la página nunca queda con scroll horizontal. Ese
 * contenedor es enfocable a propósito, para que también se pueda desplazar con
 * el teclado.
 *
 * @param {object} props
 * @param {Columna[]} props.columnas
 * @param {object[]} props.filas
 * @param {string} props.descripcion Resumen de la tabla para lectores de pantalla.
 * @param {string} [props.claveFila] Campo que identifica cada fila. Por defecto 'id'.
 * @param {string} [props.mensajeVacio]
 * @param {string} [props.className]
 */
export function Tabla({
  columnas,
  filas,
  descripcion,
  claveFila = 'id',
  mensajeVacio = 'Todavía no hay información para mostrar.',
  className = '',
}) {
  return (
    <div
      role="region"
      aria-label={descripcion}
      tabIndex={0}
      className={`relative overflow-x-auto rounded-tarjeta border border-neutro-200 bg-white ${className}`}
    >
      <table className="w-full min-w-md border-collapse text-control">
        <caption className="sr-only">{descripcion}</caption>

        <thead>
          <tr className="border-b border-neutro-200 bg-neutro-50">
            {columnas.map((columna) => (
              <th
                key={columna.clave}
                scope="col"
                className={`px-4 py-3 font-semibold text-neutro-600 ${claseDeAlineacion(columna)}`}
              >
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} className="px-4 py-12 text-center text-neutro-500">
                {mensajeVacio}
              </td>
            </tr>
          ) : (
            filas.map((fila, indice) => (
              <tr
                key={fila[claveFila] ?? indice}
                className="border-b border-neutro-100 transition-colors last:border-b-0 hover:bg-primario-50"
              >
                {columnas.map((columna) => (
                  <td
                    key={columna.clave}
                    className={`px-4 py-3 text-neutro-800 ${claseDeAlineacion(columna)}`}
                  >
                    {columna.render ? columna.render(fila) : fila[columna.clave]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
