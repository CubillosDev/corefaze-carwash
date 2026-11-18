import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Lupa: campos de búsqueda.
 *
 * @param {{ className?: string }} props
 */
export function IconoBuscar({ className }) {
  return (
    <IconoBase className={className} grosor={2}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.7-3.7" />
    </IconoBase>
  );
}
