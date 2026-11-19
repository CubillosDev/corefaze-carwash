import { useId } from 'react';

const ESTILOS_BASE = [
  'w-full rounded-control border bg-white px-3 text-cuerpo font-medium text-neutro-900',
  'placeholder:font-normal placeholder:text-neutro-400',
  'transition-[border-color,box-shadow] duration-150 outline-none',
  'disabled:cursor-not-allowed disabled:bg-neutro-100 disabled:text-neutro-500',
].join(' ');

const ESTILOS_NORMAL =
  'border-neutro-300 hover:not-disabled:border-neutro-400 focus-visible:border-primario focus-visible:shadow-foco-campo';
const VARIANTES = {
  normal: '',
  placa: 'font-mono font-semibold tracking-campo-placa uppercase placeholder:tracking-normal',
};

const TAMANOS = {
  normal: 'h-9.5',
  grande: 'h-11',
};

const ESTILOS_CON_ERROR =
  'border-error bg-error-suave focus-visible:border-error focus-visible:shadow-foco-campo';

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
 * @param {'normal'|'grande'} [props.tamano] `grande` (44 px) para formularios de una
 *   sola columna, como el de ingreso.
 * @param {import('react').ReactNode} [props.accion] Botón pequeño dentro del campo, a la
 *   derecha (por ejemplo, mostrar u ocultar la contraseña).
 * @param {'normal'|'placa'} [props.variante] `placa` escribe en JetBrains Mono y
 *   mayúsculas, como el campo de placa del diseño.
 * @param {string} [props.className] Clases del contenedor.
 */
export function CampoTexto({
  etiqueta,
  ayuda,
  error,
  requerido = false,
  id,
  variante = 'normal',
  tamano = 'normal',
  accion,
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

      <div className="relative">
        <input
          id={idCampo}
          type="text"
          {...resto}
          required={requerido}
          aria-invalid={error ? true : undefined}
          aria-describedby={descritoPor}
          className={`${ESTILOS_BASE} ${TAMANOS[tamano] ?? TAMANOS.normal} ${VARIANTES[variante] ?? ''} ${
            error ? ESTILOS_CON_ERROR : ESTILOS_NORMAL
          } ${accion ? 'pr-11' : ''}`}
        />
        {accion ? <div className="absolute inset-y-0 right-1 flex items-center">{accion}</div> : null}
      </div>

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
