import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Escudo con visto bueno: usuarios y roles.
 *
 * @param {{ className?: string }} props
 */
export function IconoUsuarios({ className }) {
  return (
    <IconoBase className={className} grosor={1.7}>
      <path d="M12 3.5 5 6v5.5c0 4.3 3 7.6 7 9 4-1.4 7-4.7 7-9V6z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </IconoBase>
  );
}
