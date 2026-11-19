import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Caja isométrica: módulo Inventario. Trazo del diseño.
 *
 * @param {{ className?: string }} props
 */
export function IconoInventario({ className }) {
  return (
    <IconoBase className={className}>
      <path d="M12 3.5 20 7.8v8.4L12 20.5 4 16.2V7.8z" />
      <path d="M4 7.8 12 12l8-4.2M12 12v8.5" />
    </IconoBase>
  );
}
