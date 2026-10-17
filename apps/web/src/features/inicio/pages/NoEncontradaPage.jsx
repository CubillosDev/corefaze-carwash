import { Link } from 'react-router';

import { RUTAS } from '@/constants/rutas';

/** Se muestra cuando la dirección del navegador no corresponde a ninguna ruta. */
export function NoEncontradaPage() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <p className="text-3xl font-bold text-primario-300">404</p>
      <h1 className="text-xl font-semibold text-neutro-900">No encontramos esta página</h1>
      <p className="text-sm text-neutro-600">
        La dirección que abriste no existe o la sección todavía no está publicada.
      </p>
      <Link
        to={RUTAS.INICIO}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primario px-4 text-sm font-medium text-white transition-colors hover:bg-primario-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario-400"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
