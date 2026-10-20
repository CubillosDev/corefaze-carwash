import { useId } from 'react';

const ESTILOS_BASE = [
  'h-10 w-full rounded-control border bg-white px-3 text-cuerpo text-neutro-900',
  'placeholder:text-neutro-400 transition-colors',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
  'disabled:cursor-not-allowed disabled:bg-neutro-100 disabled:text-neutro-500',
].join(' ');

const ESTILOS_NORMAL = 'border-neutro-300 hover:not-disabled:border-neutro-400 focus-visible:outline-primario';
const ESTILOS_CON_ERROR = 'border-error bg-error-suave focus-visible:outline-error';

/**
 * Campo de texto con etiqueta asociada, texto de ayuda y mensaje de error.
 *
 * La etiqueta siempre se asocia con htmlFor/id, y el mensaje de error y la
 * ayuda se anuncian por aria-describedby. Cuando hay error se marca
 * aria-invalid para que el lector de pantalla lo comunique.
 *
 * @param {object} props
 * @param {string} props.etiqueta Texto visible de la etiqueta.
 * @param {string} [props.ayuda] Pista permanente bajo el campo.
 * @param {string} [props.error] Mensaje de error; si viene, el campo se marca inválido.
 * @param {boolean} [props.requerido]
 * @param {string} [props.id] Se genera uno si no se entrega.
 * @param {string} [props.className] Clases del contenedor.
 */
export function CampoTexto({
  etiqueta,
  ayuda,
  error,
  requerido = false,
  id,
  className = '',
  ...resto
}) {
  const idAutomatico = useId();
  const idCampo = id ?? `campo-${idAutomatico}`;
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

      <input
        id={idCampo}
        type="text"
        {...resto}
        required={requerido}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor}
        className={`${ESTILOS_BASE} ${error ? ESTILOS_CON_ERROR : ESTILOS_NORMAL}`}
      />

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
