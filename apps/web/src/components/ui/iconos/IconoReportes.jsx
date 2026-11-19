import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Barras: sección de reportes.
 *
 * @param {{ className?: string }} props
 */
export function IconoReportes({ className }) {
  return (
    <IconoBase className={className} grosor={1.7}>
      <path d="M5 20V13M10 20V8M15 20v-5M20 20V5" />
    </IconoBase>
  );
}
