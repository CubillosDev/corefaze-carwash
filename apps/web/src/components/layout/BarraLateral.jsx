import { NavLink } from 'react-router';

import { IconoInicio } from '@/components/ui/iconos/IconoInicio';
import { IconoPaleta } from '@/components/ui/iconos/IconoPaleta';
import { RUTAS } from '@/constants/rutas';

/**
 * Secciones del panel. Cada tarea que agregue una sección suma su entrada aquí.
 */
const ENLACES = [{ ruta: RUTAS.INICIO, texto: 'Inicio', Icono: IconoInicio, exacta: true }];

/** El catálogo del sistema de diseño solo se ofrece en desarrollo. */
const ENLACES_DE_DESARROLLO = [
  { ruta: RUTAS.SISTEMA_DISENO, texto: 'Sistema de diseño', Icono: IconoPaleta, exacta: false },
];

/**
 * import.meta.env.DEV es constante durante toda la vida de la aplicación, así
 * que la lista se arma una sola vez y no en cada render.
 */
const ENLACES_VISIBLES = import.meta.env.DEV ? [...ENLACES, ...ENLACES_DE_DESARROLLO] : ENLACES;

const ESTILOS_ENLACE =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors';

/**
 * Contenido de la barra lateral: marca, navegación y pie.
 *
 * No decide dónde se ubica; LayoutPrincipal la fija a la izquierda en
 * pantallas anchas y la monta como cajón en las angostas.
 *
 * @param {object} props
 * @param {() => void} [props.alNavegar] Se llama al elegir una opción. El cajón
 *   lo usa para cerrarse.
 */
export function BarraLateral({ alNavegar }) {
  return (
    <div className="flex h-full flex-col bg-primario">
      <div className="flex h-16 shrink-0 items-center gap-2.5 px-5">
        <img src="/favicon.svg" alt="" aria-hidden="true" className="size-8 shrink-0" />
        <span className="truncate text-base font-semibold text-white">Car Wash</span>
      </div>

      <nav aria-label="Navegación principal" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <ul className="flex flex-col gap-1">
          {ENLACES_VISIBLES.map(({ ruta, texto, Icono, exacta }) => (
            <li key={ruta}>
              <NavLink
                to={ruta}
                end={exacta}
                onClick={alNavegar}
                className={({ isActive }) =>
                  `${ESTILOS_ENLACE} ${
                    isActive
                      ? 'bg-primario-600 text-white'
                      : 'text-primario-100 hover:bg-primario-700 hover:text-white'
                  }`
                }
              >
                <Icono className="size-5 shrink-0" />
                <span className="truncate">{texto}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <p className="shrink-0 px-5 pb-5 text-xs text-primario-300">Versión 0.1.0 · Sprint 0</p>
    </div>
  );
}
