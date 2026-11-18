import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Dos personas: sección de clientes.
 *
 * @param {{ className?: string }} props
 */
export function IconoClientes({ className }) {
  return (
    <IconoBase className={className} grosor={1.7}>
      <circle cx="9.5" cy="8.5" r="3.3" />
      <path d="M3.8 19c.9-3 3.1-4.6 5.7-4.6s4.8 1.6 5.7 4.6" />
      <path d="M15.6 5.6a3.2 3.2 0 0 1 0 5.9M17.6 14.7c1.4.6 2.4 2 2.9 4.3" />
    </IconoBase>
  );
}
