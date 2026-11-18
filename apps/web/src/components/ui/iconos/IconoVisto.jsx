import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Visto bueno: opción elegida.
 *
 * @param {{ className?: string }} props
 */
export function IconoVisto({ className }) {
  return (
    <IconoBase className={className} grosor={2.6}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </IconoBase>
  );
}
