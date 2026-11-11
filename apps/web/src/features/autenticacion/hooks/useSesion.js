import { useContext } from 'react';

import { SesionContexto } from '@/features/autenticacion/hooks/sesionContexto';

/**
 * Sesión actual.
 *
 * @returns {{
 *   usuario: { id: number, nombre: string, email: string, rol: string } | null,
 *   motivoCierre: 'expirada' | null,
 *   iniciarSesion: (credenciales: { email: string, password: string }) => Promise<void>,
 *   cerrarSesion: () => void,
 * }}
 */
export function useSesion() {
  return useContext(SesionContexto);
}
