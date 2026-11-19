import { Boton } from '@/components/ui/Boton';
import { IconoCelular } from '@/components/ui/iconos/IconoCelular';
import { IconoJornadas } from '@/components/ui/iconos/IconoJornadas';
import { trazoQr } from '@/utils/codigoQr';

const PASOS = ['Abre la app Corefaze en tu celular', 'Toca “Abrir jornada”', 'Apunta la cámara a este código'];

/**
 * Bloque del QR de la jornada del diseño: el código con el ícono del celular
 * encima, la cuenta regresiva hasta el código nuevo y los pasos. Debajo, la
 * opción de abrirla desde el panel, para cuando no se tiene la app a mano.
 *
 * @param {object} props
 * @param {{ contenido: string }|null} props.qr
 * @param {number} props.segundos Lo que le queda al código.
 * @param {string} props.error
 * @param {() => void} props.alReintentar
 * @param {boolean} props.enviando
 * @param {() => void} props.alAbrirAqui
 */
export function QrJornada({ qr, segundos, error, alReintentar, enviando, alAbrirAqui }) {
  const codigo = qr ? trazoQr(qr.contenido) : null;

  return (
    <>
      <div className="mt-3 flex shrink-0 flex-col items-center self-stretch rounded-tarjeta bg-neutro-75 p-3">
        <div className="relative size-35 rounded-menu bg-white p-2 shadow-tarjeta">
          {codigo ? (
            <svg
              viewBox={`0 0 ${codigo.tamano} ${codigo.tamano}`}
              shapeRendering="crispEdges"
              role="img"
              aria-label="Código QR para abrir la jornada desde la app móvil"
              className="size-full text-neutro-900"
            >
              <path d={codigo.trazo} fill="currentColor" />
            </svg>
          ) : (
            <span className="flex size-full items-center justify-center text-center text-meta text-neutro-450">
              {error ? 'Sin código' : 'Generando…'}
            </span>
          )}
          {codigo ? (
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 flex size-8.5 -translate-1/2 items-center justify-center rounded-control bg-white"
            >
              <span className="flex size-6.5 items-center justify-center rounded-[7px] bg-primario text-white">
                <IconoCelular className="size-3.5" />
              </span>
            </span>
          ) : null}
        </div>

        {error ? (
          <div className="mt-3 flex flex-col items-center gap-2 text-meta text-error" role="alert">
            {error}
            <Boton variante="secundario" tamano="pequeno" onClick={alReintentar}>
              Generar otro código
            </Boton>
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-1.5 text-meta text-neutro-600 tabular-nums" aria-live="off">
            <IconoJornadas className="size-3.25" />
            {qr ? `Código nuevo en ${segundos} s` : 'Preparando el código…'}
          </p>
        )}
      </div>

      <ol className="mt-3 flex shrink-0 flex-col gap-1.75 self-stretch text-left">
        {PASOS.map((paso, indice) => (
          <li key={paso} className="flex items-center gap-2.5 text-detalle text-neutro-700">
            <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primario-100 text-micro font-bold text-primario">
              {indice + 1}
            </span>
            <span className="min-w-0 flex-1">{paso}</span>
          </li>
        ))}
      </ol>

      <Boton variante="secundario" className="mt-3 w-full shrink-0" cargando={enviando} onClick={alAbrirAqui}>
        Abrir desde aquí
      </Boton>
    </>
  );
}
