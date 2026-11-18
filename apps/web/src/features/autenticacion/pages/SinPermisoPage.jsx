import { EnlaceBoton } from '@/components/ui/EnlaceBoton';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { RUTAS } from '@/constants/rutas';

/** 403 dentro del panel: la persona tiene sesión, pero su rol no puede usar este módulo. */
export function SinPermisoPage() {
  return (
    <Tarjeta relleno="ninguno" className="mx-auto mt-6 w-full max-w-xl">
      <section className="flex flex-col items-center gap-3 px-5 py-14 text-center">
        <p className="text-etiqueta text-neutro-500 uppercase">Error 403</p>
        <h1 className="text-titulo text-neutro-900">Sin permiso</h1>
        <p className="max-w-sm text-detalle text-neutro-600">
          Tu rol no puede usar esta sección. Si crees que es un error, pide a un administrador que
          revise tu acceso.
        </p>
        <div className="mt-2">
          <EnlaceBoton hacia={RUTAS.INICIO}>Volver al inicio</EnlaceBoton>
        </div>
      </section>
    </Tarjeta>
  );
}
