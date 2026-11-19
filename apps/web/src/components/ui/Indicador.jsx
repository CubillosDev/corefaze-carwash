import { Link } from 'react-router';

const ESTILOS =
  'block min-w-0 rounded-tarjeta border border-neutro-200 bg-white px-4 py-3.75 text-left text-neutro-900 transition-colors duration-150';

/**
 * Indicador del tablero: etiqueta, valor grande y una línea de apoyo. Si lleva
 * `hacia`, toda la tarjeta es un enlace a esa sección.
 *
 * @param {object} props
 * @param {string} props.etiqueta
 * @param {import('react').ReactNode} props.valor Ya formateado.
 * @param {import('react').ReactNode} [props.apoyo]
 * @param {import('react').ReactNode} [props.nota] Texto corto a la derecha de la etiqueta.
 * @param {boolean} [props.atencion] Pinta la nota en el tono de advertencia.
 * @param {string} [props.hacia] Ruta del navegador.
 */
export function Indicador({ etiqueta, valor, apoyo, nota, atencion = false, hacia }) {
  const contenido = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-meta text-neutro-600">{etiqueta}</span>
        {nota ? (
          <span
            className={`text-nota font-medium whitespace-nowrap tabular-nums ${
              atencion ? 'text-advertencia-fuerte' : 'text-neutro-600'
            }`}
          >
            {nota}
          </span>
        ) : null}
      </span>
      <span className="mt-2 block text-kpi tabular-nums">{valor}</span>
      {apoyo ? <span className="mt-0.5 block text-nota text-neutro-450">{apoyo}</span> : null}
    </>
  );

  return hacia ? (
    <Link to={hacia} className={`${ESTILOS} hover:border-neutro-350 hover:text-neutro-900`}>
      {contenido}
    </Link>
  ) : (
    <div className={ESTILOS}>{contenido}</div>
  );
}
