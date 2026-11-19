import { IconoUsuarios } from '@/components/ui/iconos/IconoUsuarios';
import { ModuloProximamente } from '@/components/ui/ModuloProximamente';

/**
 * Usuarios y roles. La API permite cambiar el rol de un usuario (PATCH
 * /auth/usuarios/:id/rol, solo superadmin), pero no listar usuarios: sin la
 * lista no hay a quién elegir, así que la pantalla queda en espera.
 */
export function UsuariosPage() {
  return (
    <ModuloProximamente
      titulo="Usuarios"
      descripcion="Cuentas del panel y sus roles"
      icono={<IconoUsuarios className="size-5" />}
      motivo="La API todavía no permite listar los usuarios. Cuando lo haga, aquí se aprobarán las cuentas pendientes y se asignará su rol."
    />
  );
}
