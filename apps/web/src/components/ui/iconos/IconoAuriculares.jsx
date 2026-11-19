import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Auriculares: encabezado del panel de ayuda.
 *
 * @param {{ className?: string }} props
 */
export function IconoAuriculares({ className }) {
  return (
    <IconoBase className={className} grosor={2}>
      <path d="M4 13a8 8 0 0 1 16 0" />
      <path d="M4 13v3a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2zM20 13v3a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z" />
    </IconoBase>
  );
}
