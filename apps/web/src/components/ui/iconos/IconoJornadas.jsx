import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Reloj: sección de jornadas.
 *
 * @param {{ className?: string }} props
 */
export function IconoJornadas({ className }) {
  return (
    <IconoBase className={className} grosor={1.7}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </IconoBase>
  );
}
