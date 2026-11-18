import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Flecha hacia abajo: abre un desplegable.
 *
 * @param {{ className?: string }} props
 */
export function IconoFlechaAbajo({ className }) {
  return (
    <IconoBase className={className} grosor={2}>
      <path d="m6 9 6 6 6-6" />
    </IconoBase>
  );
}
