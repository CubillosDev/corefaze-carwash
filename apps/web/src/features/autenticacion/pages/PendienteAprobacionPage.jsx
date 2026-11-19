import logoCorefaze from '@/assets/images/logo-corefaze.webp';
import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { useSesion } from '@/features/autenticacion/hooks/useSesion';

/** Pantalla para cuentas con rol `pendiente`: ya existen, pero aún no tienen acceso al panel. */
export function PendienteAprobacionPage() {
  const { usuario, cerrarSesion } = useSesion();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-marco px-4 py-8">
      {/* El logo es blanco: va sobre el marco oscuro, no sobre la tarjeta. */}
      <img src={logoCorefaze} alt="Corefaze" className="h-7 w-auto" />

      <div className="flex w-full max-w-sm flex-col gap-6 rounded-modal bg-white p-6 shadow-modal escritorio:p-8">
        <header className="text-center">
          <h1 className="text-titulo text-neutro-900">Tu cuenta está pendiente de aprobación</h1>
        </header>

        <Alerta tipo="advertencia">
          Un administrador debe asignarte un rol antes de que puedas usar el panel
          {usuario ? ` (${usuario.email})` : ''}. Cuando lo haga, vuelve a ingresar.
        </Alerta>

        <Boton variante="secundario" onClick={cerrarSesion} className="w-full">
          Cerrar sesión
        </Boton>
      </div>
    </main>
  );
}
