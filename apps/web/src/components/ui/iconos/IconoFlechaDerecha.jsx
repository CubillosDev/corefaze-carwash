import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Flecha a la derecha: abrir un detalle o pasar de página.
 *
 * @param {{ className?: string }} props
 */
export function IconoFlechaDerecha({ className }) {
  return (
    <IconoBase className={className} grosor={2}>
      <path d="m9 6 6 6-6 6" />
    </IconoBase>
  );
}
