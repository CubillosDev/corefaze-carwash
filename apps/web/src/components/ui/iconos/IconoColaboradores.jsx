import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Persona con signo más: sección de colaboradores.
 *
 * @param {{ className?: string }} props
 */
export function IconoColaboradores({ className }) {
  return (
    <IconoBase className={className} grosor={1.7}>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20a6.5 6.5 0 0 1 10.5-5.1M18 13v7M15 16.5h6" />
    </IconoBase>
  );
}
