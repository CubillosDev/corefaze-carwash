const TAMANOS = {
  normal: 'h-7 px-2.75 font-medium',
  grande: 'h-8 px-3 font-semibold',
};

/**
 * Filtros en forma de píldora con su contador. El filtro activo se pinta en
 * grafito. En pantallas angostas la fila se desplaza en horizontal.
 *
 * @param {object} props
 * @param {string} props.etiqueta Nombre accesible del grupo.
 * @param {{ valor: string, texto: string, cantidad?: number }[]} props.opciones
 * @param {string} props.valor
 * @param {(valor: string) => void} props.alCambiar
 * @param {'normal'|'grande'} [props.tamano]
 */
export function GrupoFiltros({ etiqueta, opciones, valor, alCambiar, tamano = 'normal' }) {
  return (
    <div
      role="group"
      aria-label={etiqueta}
      className="flex max-w-full gap-1.5 overflow-x-auto [scrollbar-width:none] escritorio:flex-wrap"
    >
      {opciones.map((opcion) => {
        const activo = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={activo}
            onClick={() => alCambiar(opcion.valor)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border text-detalle whitespace-nowrap transition-colors duration-150 ${
              TAMANOS[tamano] ?? TAMANOS.normal
            } ${
              activo
                ? 'border-neutro-900 bg-neutro-900 text-white'
                : 'border-neutro-275 bg-white text-neutro-700 hover:border-neutro-300'
            }`}
          >
            <span>{opcion.texto}</span>{' '}
            {opcion.cantidad === undefined ? null : (
              <span className="text-micro tabular-nums opacity-70">{opcion.cantidad}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
