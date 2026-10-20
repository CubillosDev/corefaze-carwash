import { Suspense, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router';

import { BarraLateral } from '@/components/layout/BarraLateral';
import { Encabezado } from '@/components/layout/Encabezado';
import { useFocoAtrapado } from '@/hooks/useFocoAtrapado';
import { usePantallaAngosta } from '@/hooks/usePantallaAngosta';
import { useTeclaEscape } from '@/hooks/useTeclaEscape';

const ESTILOS_BARRA = [
  'flex w-barra-lateral shrink-0 flex-col bg-neutro-250 px-3 pt-4 pb-3',
  'transition-transform duration-320 ease-suave',
  'escritorio:relative escritorio:shadow-barra-lateral',
  // Por debajo de escritorio es un cajón que entra desde la izquierda.
  'max-escritorio:fixed max-escritorio:inset-y-0 max-escritorio:left-0 max-escritorio:z-70',
  'max-escritorio:rounded-r-modal',
].join(' ');

/**
 * Armazón del panel: cabecera sobre el marco oscuro, y un panel redondeado con
 * la barra lateral y el área de contenido, que tiene su propio scroll.
 *
 * Desde el punto de quiebre escritorio la barra lateral queda fija. Por debajo
 * es un cajón: se abre desde el botón de menú, atrapa el foco, se cierra con
 * Escape, con el velo o al elegir una opción, y devuelve el foco al botón.
 * Cerrado queda inerte, así que sus enlaces no se alcanzan con el teclado.
 */
export function LayoutPrincipal() {
  const angosta = usePantallaAngosta();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [angostaAnterior, setAngostaAnterior] = useState(angosta);
  const barra = useRef(null);
  const contenido = useRef(null);
  const idBarra = useId();
  const { pathname } = useLocation();

  // Si la ventana cruza el punto de quiebre, el cajón se cierra: así no
  // reaparece abierto al volver a una pantalla angosta.
  if (angosta !== angostaAnterior) {
    setAngostaAnterior(angosta);
    setMenuAbierto(false);
  }

  const cajonAbierto = angosta && menuAbierto;

  const abrirMenu = useCallback(() => setMenuAbierto(true), []);
  const cerrarMenu = useCallback(() => setMenuAbierto(false), []);

  useTeclaEscape(cajonAbierto, cerrarMenu);
  useFocoAtrapado(barra, cajonAbierto);

  // El contenido tiene su propio scroll: al cambiar de página vuelve arriba.
  useEffect(() => {
    contenido.current.scrollTop = 0;
  }, [pathname]);

  return (
    <div className="flex h-dvh flex-col bg-marco">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-90 focus:rounded-control focus:bg-white focus:px-4 focus:py-2 focus:text-control focus:font-medium focus:text-neutro-900"
      >
        Saltar al contenido
      </a>

      <Encabezado alAbrirMenu={abrirMenu} menuAbierto={cajonAbierto} idMenu={idBarra} />

      <div className="mx-1.5 mb-1.5 flex min-h-0 flex-1 overflow-hidden rounded-modal bg-neutro-50 escritorio:mx-2 escritorio:mb-2 escritorio:rounded-panel">
        {cajonAbierto ? (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={cerrarMenu}
            className="fixed inset-0 z-65 animate-aparecer-velo bg-velo"
          />
        ) : null}

        <aside
          ref={barra}
          id={idBarra}
          role={cajonAbierto ? 'dialog' : undefined}
          aria-modal={cajonAbierto || undefined}
          aria-label={cajonAbierto ? 'Menú de navegación' : undefined}
          inert={angosta && !menuAbierto}
          className={`${ESTILOS_BARRA} ${
            cajonAbierto ? 'max-escritorio:shadow-cajon' : 'max-escritorio:-translate-x-[105%]'
          }`}
        >
          {cajonAbierto ? (
            <button
              type="button"
              onClick={cerrarMenu}
              className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-3 focus-visible:right-3 focus-visible:rounded-control focus-visible:bg-white focus-visible:px-3 focus-visible:py-1.5 focus-visible:text-control focus-visible:text-neutro-900"
            >
              Cerrar menú
            </button>
          ) : null}

          <BarraLateral alNavegar={cerrarMenu} />
        </aside>

        <main
          ref={contenido}
          id="contenido-principal"
          tabIndex={-1}
          className="relative min-w-0 flex-1 overflow-auto bg-neutro-50 focus-visible:outline-none"
        >
          <div
            key={pathname}
            className="min-h-full animate-entrar-vista px-3.5 pt-4.5 pb-6.5 escritorio:px-6.5 escritorio:pt-5.5 escritorio:pb-7.5"
          >
            <Suspense fallback={null}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
