import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Etiqueta de precio: catálogo de servicios.
 *
 * @param {{ className?: string }} props
 */
export function IconoCatalogo({ className }) {
  return (
    <IconoBase className={className} grosor={1.7}>
      <path d="M3.5 12.6V5A1.5 1.5 0 0 1 5 3.5h7.6l8 8a1.5 1.5 0 0 1 0 2.1l-6.5 6.5a1.5 1.5 0 0 1-2.1 0z" />
      <circle cx="8" cy="8" r="1.4" />
    </IconoBase>
  );
}
