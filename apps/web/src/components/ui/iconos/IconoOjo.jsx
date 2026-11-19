import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Ojo abierto: mostrar un texto oculto, como la contraseña.
 *
 * @param {{ className?: string }} props
 */
export function IconoOjo({ className }) {
  return (
    <IconoBase className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </IconoBase>
  );
}
