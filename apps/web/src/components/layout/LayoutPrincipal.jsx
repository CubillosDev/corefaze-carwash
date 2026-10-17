import { useCallback, useRef, useState } from 'react';
import { Outlet } from 'react-router';

import { BarraLateral } from '@/components/layout/BarraLateral';
import { Encabezado } from '@/components/layout/Encabezado';
import { IconoCerrar } from '@/components/ui/iconos/IconoCerrar';
import { useBloqueoDeScroll } from '@/hooks/useBloqueoDeScroll';
import { useFocoAtrapado } from '@/hooks/useFocoAtrapado';
import { useTeclaEscape } from '@/hooks/useTeclaEscape';

/**
 * Armazón del panel: barra lateral, encabezado y área de contenido.
 *
 * Desde 1024 px (lg) la barra lateral queda fija a la izquierda. Por debajo se
 * oculta y se abre como cajón desde el botón de menú del encabezado: atrapa el
 * foco, se cierra con Escape, con el velo o al elegir una opción, y devuelve el
 * foco al botón que lo abrió.
 */
export function LayoutPrincipal() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cajon = useRef(null);

  const abrirMenu = useCallback(() => setMenuAbierto(true), []);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  useTeclaEscape(menuAbierto, cerrarMenu);
  useFocoAtrapado(cajon, menuAbierto);
  useBloqueoDeScroll(menuAbierto);

  return (
    <div className="min-h-dvh">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-primario focus:px-4 focus:py-2 focus:text-control focus:font-medium focus:text-white"
      >
        Saltar al contenido
      </a>

      {/* Barra lateral fija: solo desde lg. */}
      <aside className="hidden escritorio:fixed escritorio:inset-y-0 escritorio:left-0 escritorio:z-30 escritorio:block escritorio:w-64">
        <BarraLateral />
      </aside>

      {/* Cajón de navegación: solo por debajo de lg y solo cuando está abierto,
          para que sus enlaces no queden alcanzables con Tab estando oculto. */}
      {menuAbierto ? (
        <div className="escritorio:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={cerrarMenu}
            className="fixed inset-0 z-40 animate-aparecer-velo bg-velo"
          />

          <div
            ref={cajon}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
            tabIndex={-1}
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85%] shadow-cajon"
          >
            <button
              type="button"
              onClick={cerrarMenu}
              aria-label="Cerrar menú de navegación"
              className="absolute top-4 right-3 rounded-control p-2 text-primario-100 transition-colors hover:bg-primario-800 hover:text-white"
            >
              <IconoCerrar />
            </button>

            <BarraLateral alNavegar={cerrarMenu} />
          </div>
        </div>
      ) : null}

      <div className="escritorio:pl-64">
        <Encabezado alAbrirMenu={abrirMenu} menuAbierto={menuAbierto} />

        <main
          id="contenido-principal"
          className="mx-auto w-full max-w-7xl px-4 py-6 escritorio:px-8 escritorio:py-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
