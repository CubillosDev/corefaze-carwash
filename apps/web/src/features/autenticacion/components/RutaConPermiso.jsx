import { Outlet, useLocation } from 'react-router';

import { rolPuedeAcceder } from '@/constants/permisos';
import { useSesion } from '@/features/autenticacion/hooks/useSesion';
import { SinPermisoPage } from '@/features/autenticacion/pages/SinPermisoPage';

/**
 * Ruta de layout que va DENTRO del armazón del panel: si el rol no puede usar
 * el módulo de la dirección actual, muestra "Sin permiso" (403) en el área de
 * contenido y deja visibles el menú y la cabecera.
 */
export function RutaConPermiso() {
  const { usuario } = useSesion();
  const { pathname } = useLocation();

  if (!rolPuedeAcceder(usuario?.rol, pathname)) {
    return <SinPermisoPage />;
  }

  return <Outlet />;
}
