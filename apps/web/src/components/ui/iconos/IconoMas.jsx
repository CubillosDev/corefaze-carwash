import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Signo más: acciones de crear.
 *
 * @param {{ className?: string }} props
 */
export function IconoMas({ className }) {
  return (
    <IconoBase className={className} grosor={2.2}>
      <path d="M12 5v14M5 12h14" />
    </IconoBase>
  );
}
