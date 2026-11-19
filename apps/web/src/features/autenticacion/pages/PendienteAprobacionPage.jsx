import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { MarcoAcceso } from '@/features/autenticacion/components/MarcoAcceso';
import { useSesion } from '@/features/autenticacion/hooks/useSesion';

/** Pantalla para cuentas con rol `pendiente`: ya existen, pero aún no tienen acceso al panel. */
export function PendienteAprobacionPage() {
  const { usuario, cerrarSesion } = useSesion();

  return (
    <MarcoAcceso titulo="Tu cuenta está pendiente de aprobación" descripcion={usuario?.email ?? ''}>
      <Alerta tipo="advertencia">
        Un superadministrador debe asignarte un rol antes de que puedas usar el panel. Cuando lo haga, vuelve a ingresar.
      </Alerta>

      <Boton variante="secundario" tamano="alto" onClick={cerrarSesion} className="w-full">
        Cerrar sesión
      </Boton>
    </MarcoAcceso>
  );
}
