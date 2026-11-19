import { IconoOjo } from '@/components/ui/iconos/IconoOjo';
import { IconoOjoTachado } from '@/components/ui/iconos/IconoOjoTachado';

/**
 * Botón dentro del campo de contraseña para mostrarla u ocultarla.
 *
 * @param {object} props
 * @param {boolean} props.visible
 * @param {(visible: boolean) => void} props.alCambiar
 * @param {string} [props.etiqueta]
 */
export function BotonVerClave({ visible, alCambiar, etiqueta = 'Mostrar contraseña' }) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      aria-pressed={visible}
      onClick={() => alCambiar(!visible)}
      className="inline-flex size-9 items-center justify-center rounded-opcion text-neutro-500 transition-colors duration-150 hover:bg-neutro-100 hover:text-neutro-900"
    >
      {visible ? <IconoOjoTachado className="size-4.5" /> : <IconoOjo className="size-4.5" />}
    </button>
  );
}
