import { EnlaceBoton } from '@/components/ui/EnlaceBoton';
import { Tarjeta } from '@/components/ui/Tarjeta';
import { RUTAS } from '@/constants/rutas';

/** Se muestra cuando la dirección del navegador no corresponde a ninguna ruta. */
export function NoEncontradaPage() {
  return (
    <Tarjeta relleno="ninguno" className="mx-auto mt-6 w-full max-w-xl">
      <section className="flex flex-col items-center gap-3 px-5 py-14 text-center">
        <p className="text-etiqueta text-neutro-500 uppercase">Error 404</p>
        <h1 className="text-titulo text-neutro-900">No encontramos esta página</h1>
        <p className="max-w-sm text-detalle text-neutro-600">
          La dirección que abriste no existe o la sección todavía no está publicada.
        </p>
        <div className="mt-2">
          <EnlaceBoton hacia={RUTAS.INICIO}>Volver al inicio</EnlaceBoton>
        </div>
      </section>
    </Tarjeta>
  );
}
