const TAMANOS = {
  normal: { grupo: 'bg-neutro-250', boton: 'h-7 px-3 text-detalle' },
  compacto: { grupo: 'bg-neutro-150', boton: 'h-6.5 px-2.75 text-meta' },
};

/**
 * Conmutador de opciones excluyentes (Tablero / Lista). La opción elegida
 * queda en blanco con una sombra corta, como en el diseño.
 *
 * @param {object} props
 * @param {string} props.etiqueta Nombre accesible del grupo.
 * @param {{ valor: string, texto: import('react').ReactNode }[]} props.opciones
 * @param {string} props.valor
 * @param {(valor: string) => void} props.alCambiar
 * @param {'normal'|'compacto'} [props.tamano]
 */
export function ControlSegmentado({ etiqueta, opciones, valor, alCambiar, tamano = 'normal' }) {
  const estilos = TAMANOS[tamano] ?? TAMANOS.normal;

  return (
    <div role="group" aria-label={etiqueta} className={`flex gap-0.5 rounded-bloque p-0.75 ${estilos.grupo}`}>
      {opciones.map((opcion) => {
        const elegida = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={elegida}
            onClick={() => alCambiar(opcion.valor)}
            className={`inline-flex items-center gap-1.5 rounded-opcion font-semibold whitespace-nowrap transition-all duration-180 ${estilos.boton} ${
              elegida ? 'bg-white text-neutro-900 shadow-segmento' : 'text-neutro-600 hover:text-neutro-900'
            }`}
          >
            {opcion.texto}
          </button>
        );
      })}
    </div>
  );
}
