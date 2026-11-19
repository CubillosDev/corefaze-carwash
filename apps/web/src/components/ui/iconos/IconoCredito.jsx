import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Edificio: sección de crédito empresarial.
 *
 * @param {{ className?: string }} props
 */
export function IconoCredito({ className }) {
  return (
    <IconoBase className={className} grosor={1.7}>
      <path d="M4 20V8l8-4 8 4v12M9 20v-6h6v6M4 20h16" />
    </IconoBase>
  );
}
