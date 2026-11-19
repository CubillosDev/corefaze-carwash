import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Signo de pregunta: botón flotante de ayuda.
 *
 * @param {{ className?: string }} props
 */
export function IconoAyuda({ className }) {
  return (
    <IconoBase className={className} grosor={2.2}>
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5M12 17.5h.01" />
    </IconoBase>
  );
}
