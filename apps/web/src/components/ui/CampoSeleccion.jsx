import { useId } from 'react';

const ESTILOS_BASE = [
  'h-10 w-full rounded-control border bg-white px-3 text-cuerpo text-neutro-900',
  'transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
  'disabled:cursor-not-allowed disabled:bg-neutro-100 disabled:text-neutro-500',
].join(' ');

const ESTILOS_NORMAL = 'border-neutro-300 hover:not-disabled:border-neutro-400 focus-visible:outline-primario';
const ESTILOS_CON_ERROR = 'border-error bg-error-suave focus-visible:outline-error';

/**
 * Lista desplegable con etiqueta asociada, ayuda y mensaje de error. Es el
 * mismo molde que CampoTexto (etiqueta con htmlFor, aria-describedby y
 * aria-invalid), pero para elegir una opción de una lista cerrada.
 *
 * Usa el <select> nativo a propósito: funciona con teclado, lectores de
 * pantalla y en el móvil sin código adicional.
 *
 * @param {object} props
 * @param {string} props.etiqueta Texto visible de la etiqueta.
 * @param {{ valor: string|number, texto: string }[]} props.opciones
 * @param {string} [props.marcador] Texto de la opción vacía inicial ("Selecciona...").
 *   Si no se entrega, no hay opción vacía.
 * @param {string} [props.ayuda] Pista permanente bajo el campo.
 * @param {string} [props.error] Mensaje de error; si viene, el campo se marca inválido.
 * @param {boolean} [props.requerido]
 * @param {string} [props.id] Se genera uno si no se entrega.
 * @param {string} [props.className] Clases del contenedor.
 */
export function CampoSeleccion({
  etiqueta,
  opciones,
  marcador,
  ayuda,
  error,
  requerido = false,
  id,
  className = '',
  ...resto
}) {
  const idAutomatico = useId();
  const idCampo = id ?? `seleccion-${idAutomatico}`;
  const idAyuda = `${idCampo}-ayuda`;
  const idError = `${idCampo}-error`;

  const descritoPor =
    [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={idCampo} className="text-meta font-semibold text-neutro-700">
        {etiqueta}
        {requerido ? (
          <span className="ml-0.5 text-error" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      <select
        id={idCampo}
        {...resto}
        required={requerido}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor}
        className={`${ESTILOS_BASE} ${error ? ESTILOS_CON_ERROR : ESTILOS_NORMAL}`}
      >
        {marcador !== undefined ? <option value="">{marcador}</option> : null}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.texto}
          </option>
        ))}
      </select>

      {ayuda ? (
        <p id={idAyuda} className="text-meta text-neutro-600">
          {ayuda}
        </p>
      ) : null}

      {error ? (
        <p id={idError} className="text-meta font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
