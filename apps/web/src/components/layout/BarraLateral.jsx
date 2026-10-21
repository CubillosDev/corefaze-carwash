import { useId } from 'react';
import { matchPath, NavLink, useLocation } from 'react-router';

import { IconoInicio } from '@/components/ui/iconos/IconoInicio';
import { IconoPaleta } from '@/components/ui/iconos/IconoPaleta';
import { rolPuedeAcceder } from '@/constants/permisos';
import { MENU_PRINCIPAL } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion';

const ICONOS = Object.freeze({ inicio: IconoInicio, paleta: IconoPaleta });

/** Alto de cada opción (h-8.5) más el espacio entre ellas (gap-0.5), en unidades de --spacing. */
const PASO_DEL_MENU = 9;

const ESTILOS_OPCION = [
  'relative flex h-8.5 items-center gap-2.5 rounded-control px-2.5',
  'text-left text-cuerpo font-medium whitespace-nowrap',
  'transition-colors duration-200 ease-estandar',
].join(' ');

/**
 * Contenido de la barra lateral: la etiqueta "Menú" y las opciones de
 * MENU_PRINCIPAL que el rol de la sesión puede usar (solo es experiencia de
 * usuario: la API valida igual). Una píldora blanca se desliza hasta la opción
 * activa.
 *
 * No decide dónde se ubica; LayoutPrincipal la deja fija en escritorio y la
 * convierte en cajón en pantallas angostas.
 *
 * @param {object} props
 * @param {() => void} [props.alNavegar] Se llama al elegir una opción. El cajón
 *   lo usa para cerrarse.
 */
export function BarraLateral({ alNavegar }) {
  const idEtiqueta = useId();
  const { pathname } = useLocation();
  const { usuario } = useSesion();
  const opciones = MENU_PRINCIPAL.filter(({ ruta }) => rolPuedeAcceder(usuario?.rol, ruta));
  const indiceActivo = opciones.findIndex(
    ({ ruta, exacta }) => matchPath({ path: ruta, end: exacta }, pathname) !== null,
  );

  return (
    <>
      <p id={idEtiqueta} className="px-2.5 pb-2.5 text-etiqueta text-neutro-500 uppercase">
        Menú
      </p>

      <nav aria-labelledby={idEtiqueta} className="relative">
        {indiceActivo >= 0 ? (
          <span
            data-pildora
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-8.5 rounded-control bg-white shadow-pildora transition-transform duration-320 ease-suave"
            style={{
              transform: `translateY(calc(var(--spacing) * ${PASO_DEL_MENU * indiceActivo}))`,
            }}
          />
        ) : null}

        <ul className="relative flex flex-col gap-0.5">
          {opciones.map(({ ruta, texto, icono, exacta }) => {
            const Icono = ICONOS[icono];
            return (
              <li key={ruta}>
                <NavLink
                  to={ruta}
                  end={exacta}
                  onClick={alNavegar}
                  className={({ isActive }) =>
                    `${ESTILOS_OPCION} ${isActive ? 'text-neutro-900' : 'text-neutro-800'}`
                  }
                >
                  <Icono className="size-4.25 shrink-0" />
                  <span className="truncate">{texto}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
