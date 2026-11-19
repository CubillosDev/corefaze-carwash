import { useId } from 'react';
import { matchPath, NavLink, useLocation } from 'react-router';

import { IconoCatalogo } from '@/components/ui/iconos/IconoCatalogo';
import { IconoClientes } from '@/components/ui/iconos/IconoClientes';
import { IconoColaboradores } from '@/components/ui/iconos/IconoColaboradores';
import { IconoCredito } from '@/components/ui/iconos/IconoCredito';
import { IconoInicio } from '@/components/ui/iconos/IconoInicio';
import { IconoJornadas } from '@/components/ui/iconos/IconoJornadas';
import { IconoOrdenes } from '@/components/ui/iconos/IconoOrdenes';
import { IconoPaleta } from '@/components/ui/iconos/IconoPaleta';
import { IconoReportes } from '@/components/ui/iconos/IconoReportes';
import { IconoUsuarios } from '@/components/ui/iconos/IconoUsuarios';
import { IconoVehiculo } from '@/components/ui/iconos/IconoVehiculo';
import { rolPuedeAcceder } from '@/constants/permisos';
import { MENU_PRINCIPAL } from '@/constants/rutas';
import { useSesion } from '@/features/autenticacion';

const ICONOS = Object.freeze({
  inicio: IconoInicio,
  ordenes: IconoOrdenes,
  clientes: IconoClientes,
  vehiculo: IconoVehiculo,
  credito: IconoCredito,
  colaboradores: IconoColaboradores,
  catalogo: IconoCatalogo,
  jornadas: IconoJornadas,
  usuarios: IconoUsuarios,
  reportes: IconoReportes,
  paleta: IconoPaleta,
});

/** Alto de cada opción (h-8.5) más el espacio entre ellas (gap-0.5), en unidades de --spacing. */
const PASO_DEL_MENU = 9;

/** Alto del título de un grupo (h-7.5) más su espacio inferior (mb-0.5). */
const PASO_DEL_GRUPO = 8;

const ESTILOS_OPCION = [
  'relative flex h-8.5 items-center gap-2.5 rounded-control px-2.5',
  'text-left text-cuerpo font-medium whitespace-nowrap',
  'transition-colors duration-200 ease-estandar',
].join(' ');

const ESTILOS_TITULO = 'text-etiqueta text-neutro-500 uppercase';

/** Agrupa las opciones conservando el orden de MENU_PRINCIPAL. */
function agrupar(opciones) {
  const grupos = [];
  for (const opcion of opciones) {
    const ultimo = grupos.at(-1);
    if (ultimo?.titulo === opcion.grupo) {
      ultimo.opciones.push(opcion);
    } else {
      grupos.push({ titulo: opcion.grupo, opciones: [opcion] });
    }
  }
  return grupos;
}

/** Desplazamiento de la píldora hasta la opción activa, en unidades de --spacing. */
function desplazamientoDe(grupos, rutaActiva) {
  let opcionesAntes = 0;
  for (const [indiceGrupo, grupo] of grupos.entries()) {
    const indice = grupo.opciones.findIndex(({ ruta }) => ruta === rutaActiva);
    if (indice >= 0) {
      return (opcionesAntes + indice) * PASO_DEL_MENU + indiceGrupo * PASO_DEL_GRUPO;
    }
    opcionesAntes += grupo.opciones.length;
  }
  return null;
}

/**
 * Contenido de la barra lateral: las opciones de MENU_PRINCIPAL que el rol de
 * la sesión puede usar, agrupadas bajo sus títulos (solo es experiencia de
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
  const idBase = useId();
  const { pathname } = useLocation();
  const { usuario } = useSesion();
  const opciones = MENU_PRINCIPAL.filter(({ ruta }) => rolPuedeAcceder(usuario?.rol, ruta));
  const grupos = agrupar(opciones);
  const activa = opciones.find(
    ({ ruta, exacta }) => matchPath({ path: ruta, end: exacta }, pathname) !== null,
  );
  const desplazamiento = activa ? desplazamientoDe(grupos, activa.ruta) : null;
  const idTitulo = (indice) => `${idBase}-grupo-${indice}`;

  if (grupos.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Menú principal">
      <p id={idTitulo(0)} className={`px-2.5 pb-2.5 ${ESTILOS_TITULO}`}>
        {grupos[0].titulo}
      </p>

      <div className="relative">
        {desplazamiento === null ? null : (
          <span
            data-pildora
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-8.5 rounded-control bg-white shadow-pildora transition-transform duration-320 ease-suave"
            style={{ transform: `translateY(calc(var(--spacing) * ${desplazamiento}))` }}
          />
        )}

        <ul className="relative flex flex-col gap-0.5">
          {grupos.map((grupo, indiceGrupo) => (
            <li key={grupo.titulo}>
              {indiceGrupo > 0 ? (
                <p
                  id={idTitulo(indiceGrupo)}
                  className={`mb-0.5 flex h-7.5 items-end px-2.5 pb-1.5 ${ESTILOS_TITULO}`}
                >
                  {grupo.titulo}
                </p>
              ) : null}

              <ul aria-labelledby={idTitulo(indiceGrupo)} className="flex flex-col gap-0.5">
                {grupo.opciones.map(({ ruta, texto, icono, exacta }) => {
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
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
