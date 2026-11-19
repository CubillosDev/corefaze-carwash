import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Caja registradora (tarjeta con banda): módulo Caja. Trazo del diseño.
 *
 * @param {{ className?: string }} props
 */
export function IconoCaja({ className }) {
  return (
    <IconoBase className={className}>
      <rect x="3.5" y="6" width="17" height="12.5" rx="2.2" />
      <path d="M3.5 10h17M7.5 14.5h3" />
    </IconoBase>
  );
}
