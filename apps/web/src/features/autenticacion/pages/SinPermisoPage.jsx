import { Link } from 'react-router';

import { RUTAS } from '@/constants/rutas';

/** 403 dentro del panel: la persona tiene sesión, pero su rol no puede usar este módulo. */
export function SinPermisoPage() {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-etiqueta text-neutro-500 uppercase">Error 403</p>
      <h1 className="text-titulo text-neutro-900">Sin permiso</h1>
      <p className="max-w-prose text-cuerpo text-neutro-600">
        Tu rol no puede usar esta sección. Si crees que es un error, pide a un administrador que
        revise tu acceso.
      </p>
      <Link
        to={RUTAS.INICIO}
        className="inline-flex h-10 items-center rounded-control bg-primario px-4 text-control font-medium text-white transition-colors duration-150 hover:bg-primario-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
