import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Credencial con foto: sección de colaboradores. Se distingue de Nómina, que
 * usa la persona con signo más del diseño.
 *
 * @param {{ className?: string }} props
 */
export function IconoColaboradores({ className }) {
  return (
    <IconoBase className={className} grosor={1.7}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
      <circle cx="9" cy="11" r="2" />
      <path d="M6 16a3.2 3.2 0 0 1 6 0M14.5 10h3M14.5 13.5h3" />
    </IconoBase>
  );
}
