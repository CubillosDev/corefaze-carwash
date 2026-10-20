/**
 * Muestra de un color del tema.
 *
 * El valor llega leído de la variable CSS que genera `@theme`, no de un hex
 * escrito a mano, para que el catálogo nunca se desincronice del sistema de
 * diseño.
 *
 * @param {object} props
 * @param {string} props.token Nombre sin el prefijo, por ejemplo 'primario-500'.
 * @param {string} props.clase Clase de fondo literal, por ejemplo 'bg-primario-500'.
 * @param {string} [props.valor] Valor resuelto de la variable CSS.
 */
export function MuestraDeColor({ token, clase, valor }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`size-10 shrink-0 rounded-control ring-1 ring-neutro-900/10 ring-inset ${clase}`}
      />
      <span className="min-w-0">
        <span className="block font-mono text-meta break-words text-neutro-700">{token}</span>
        <span className="block font-mono text-meta break-words text-neutro-500">
          {valor || '—'}
        </span>
      </span>
    </div>
  );
}
