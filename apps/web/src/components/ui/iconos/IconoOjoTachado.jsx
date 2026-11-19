import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Ojo tachado: volver a ocultar un texto, como la contraseña.
 *
 * @param {{ className?: string }} props
 */
export function IconoOjoTachado({ className }) {
  return (
    <IconoBase className={className}>
      <path d="M10.6 5.6A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.5M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </IconoBase>
  );
}
