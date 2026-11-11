import { Navigate, Outlet, useLocation } from 'react-router';

import { RUTAS } from '@/constants/rutas';
import { esRolPendiente } from '@/constants/permisos';
import { useSesion } from '@/features/autenticacion/hooks/useSesion';
import { PendienteAprobacionPage } from '@/features/autenticacion/pages/PendienteAprobacionPage';

/**
 * Puerta de entrada del panel (ruta de layout, sin diseño propio).
 *
 * - Sin sesión: manda a /ingreso y recuerda a dónde quería ir la persona.
 * - Cuenta `pendiente`: muestra la pantalla de aprobación en lugar del panel.
 * - Con sesión y rol operativo: deja pasar.
 *
 * Es solo experiencia de usuario; la API valida el token en cada solicitud.
 */
export function RutaPrivada() {
  const { usuario } = useSesion();
  const ubicacion = useLocation();

  if (!usuario) {
    return (
      <Navigate
        to={RUTAS.INGRESO}
        replace
        state={{ desde: `${ubicacion.pathname}${ubicacion.search}` }}
      />
    );
  }

  if (esRolPendiente(usuario.rol)) {
    return <PendienteAprobacionPage />;
  }

  return <Outlet />;
}
