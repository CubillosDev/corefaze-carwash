import { IconoAdvertencia } from '@/components/ui/iconos/IconoAdvertencia';
import { IconoCerrar } from '@/components/ui/iconos/IconoCerrar';
import { IconoError } from '@/components/ui/iconos/IconoError';
import { IconoExito } from '@/components/ui/iconos/IconoExito';
import { IconoInfo } from '@/components/ui/iconos/IconoInfo';

const CONFIGURACION_POR_TIPO = {
  exito: {
    Icono: IconoExito,
    contenedor: 'border-exito-borde bg-exito-suave',
    acento: 'text-exito',
  },
  advertencia: {
    Icono: IconoAdvertencia,
    contenedor: 'border-advertencia-borde bg-advertencia-suave',
    acento: 'text-advertencia',
  },
  error: {
    Icono: IconoError,
    contenedor: 'border-error-borde bg-error-suave',
    acento: 'text-error',
  },
  info: {
    Icono: IconoInfo,
    contenedor: 'border-info-borde bg-info-suave',
    acento: 'text-info',
  },
};

/**
 * Mensaje de estado en línea.
 *
 * Los errores y advertencias se anuncian como `alert` (interrumpen al lector
 * de pantalla) y los mensajes de éxito e información como `status`.
 *
 * @param {object} props
 * @param {'exito'|'advertencia'|'error'|'info'} [props.tipo]
 * @param {string} [props.titulo]
 * @param {import('react').ReactNode} [props.children] Detalle del mensaje.
 * @param {() => void} [props.alCerrar] Si se entrega, aparece el botón de cerrar.
 * @param {string} [props.className]
 */
export function Alerta({ tipo = 'info', titulo, children, alCerrar, className = '' }) {
  const configuracion = CONFIGURACION_POR_TIPO[tipo] ?? CONFIGURACION_POR_TIPO.info;
  const { Icono } = configuracion;
  const interrumpe = tipo === 'error' || tipo === 'advertencia';

  return (
    <div
      role={interrumpe ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${configuracion.contenedor} ${className}`}
    >
      <Icono className={`mt-0.5 size-5 shrink-0 ${configuracion.acento}`} />

      <div className="min-w-0 flex-1">
        {titulo ? (
          <p className={`font-semibold ${configuracion.acento}`}>{titulo}</p>
        ) : null}
        {children ? <div className="text-neutro-700">{children}</div> : null}
      </div>

      {alCerrar ? (
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar mensaje"
          className={`-m-1 shrink-0 rounded-lg p-1 transition-colors hover:bg-neutro-900/5 ${configuracion.acento}`}
        >
          <IconoCerrar className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
