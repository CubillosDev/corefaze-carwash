import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Flecha a la izquierda: página anterior.
 *
 * @param {{ className?: string }} props
 */
export function IconoFlechaIzquierda({ className }) {
  return (
    <IconoBase className={className} grosor={2}>
      <path d="m15 6-6 6 6 6" />
    </IconoBase>
  );
}
