/**
 * Indicador de carga: anillo azul que gira y un texto que lo explica. Se
 * anuncia a los lectores de pantalla como estado.
 *
 * @param {object} props
 * @param {string} [props.texto]
 * @param {string} [props.className]
 */
export function EstadoCarga({ texto = 'Cargando…', className = '' }) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-2.5 px-5 py-10 text-detalle font-semibold text-neutro-900 ${className}`}
    >
      <span
        aria-hidden="true"
        className="size-6.5 animate-girar rounded-full border-[2.5px] border-primario-100 border-t-primario"
      />
      {texto}
    </div>
  );
}
