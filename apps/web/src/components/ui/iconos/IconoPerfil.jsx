import { IconoBase } from '@/components/ui/iconos/IconoBase';

/**
 * Silueta de persona: botón de perfil de la cabecera.
 *
 * @param {{ className?: string }} props
 */
export function IconoPerfil({ className }) {
  return (
    <IconoBase className={className} grosor={1.8}>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20c1.3-3.4 4-5.1 7.2-5.1s5.9 1.7 7.2 5.1" />
    </IconoBase>
  );
}
