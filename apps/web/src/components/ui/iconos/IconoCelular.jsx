import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Celular: estado de la jornada.
 *
 * @param {{ className?: string }} props
 */
export function IconoCelular({ className }) {
  return (
    <IconoBase className={className} grosor={2}>
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M11 18.5h2" />
    </IconoBase>
  );
}
