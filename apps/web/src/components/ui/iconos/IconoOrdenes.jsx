import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Gota de agua: sección de órdenes de lavado.
 *
 * @param {{ className?: string }} props
 */
export function IconoOrdenes({ className }) {
  return (
    <IconoBase className={className} grosor={1.7}>
      <path d="M12 3.5c3 3.6 5.6 6.8 5.6 10.1a5.6 5.6 0 0 1-11.2 0c0-3.3 2.6-6.5 5.6-10.1z" />
      <path d="M9.6 14.4a2.5 2.5 0 0 0 2.4 2.1" />
    </IconoBase>
  );
}
