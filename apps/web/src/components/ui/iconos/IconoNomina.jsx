import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Persona con un signo más: módulo Nómina. Trazo del diseño.
 *
 * @param {{ className?: string }} props
 */
export function IconoNomina({ className }) {
  return (
    <IconoBase className={className}>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20a6.5 6.5 0 0 1 10.5-5.1M18 13v7M15 16.5h6" />
    </IconoBase>
  );
}
