import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { Boton } from '@/components/ui/Boton';
import { IconoPerfil } from '@/components/ui/iconos/IconoPerfil';
import { etiquetaDeRol } from '@/constants/permisos';
import { useSesion } from '@/features/autenticacion/hooks/useSesion';
import { useTeclaEscape } from '@/hooks/useTeclaEscape';

/**
 * Menú de perfil de la cabecera: nombre, correo, rol y "Cerrar sesión", con el
 * estilo de los menús desplegables del diseño.
 *
 * Es un botón que muestra y oculta un panel. Se cierra con Escape (devolviendo
 * el foco al botón), al hacer clic por fuera y al cerrar sesión. Sin sesión no
 * dibuja nada.
 */
export function MenuPerfil() {
  const { usuario, cerrarSesion } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef(null);
  const boton = useRef(null);
  const idPanel = useId();

  const cerrar = useCallback(() => setAbierto(false), []);
  const cerrarYEnfocar = useCallback(() => {
    setAbierto(false);
    boton.current?.focus();
  }, []);

  useTeclaEscape(abierto, cerrarYEnfocar);

  useEffect(() => {
    if (!abierto) {
      return undefined;
    }

    function cerrarSiClicFuera(evento) {
      if (!contenedor.current?.contains(evento.target)) {
        cerrar();
      }
    }

    document.addEventListener('pointerdown', cerrarSiClicFuera);
    return () => document.removeEventListener('pointerdown', cerrarSiClicFuera);
  }, [abierto, cerrar]);

  if (!usuario) {
    return null;
  }

  return (
    <div ref={contenedor} className="relative">
      <Boton
        ref={boton}
        variante="marco"
        tamano="icono"
        onClick={() => setAbierto((valor) => !valor)}
        aria-label={`Perfil de ${usuario.nombre}`}
        aria-expanded={abierto}
        aria-controls={idPanel}
      >
        <IconoPerfil className="size-4.75" />
      </Boton>

      {abierto ? (
        <div
          id={idPanel}
          className="absolute top-10 right-0 z-96 w-55 animate-aparecer rounded-menu bg-white p-1.25 shadow-desplegable"
        >
          <p className="px-2.25 pt-1.75 pb-1.25 text-etiqueta-menu text-neutro-450 uppercase">
            Mi cuenta
          </p>
          <div className="min-w-0 px-2.25 pb-2">
            <p className="truncate text-control font-semibold text-neutro-900">{usuario.nombre}</p>
            <p className="truncate text-meta text-neutro-600">{usuario.email}</p>
            <p className="mt-1 text-meta font-semibold text-primario-800">
              {etiquetaDeRol(usuario.rol)}
            </p>
          </div>

          <div aria-hidden="true" className="mx-1 my-1.25 h-px bg-neutro-150" />

          <button
            type="button"
            onClick={() => {
              cerrar();
              cerrarSesion();
            }}
            className="h-8.5 w-full rounded-opcion px-2.5 text-left text-detalle text-neutro-600 transition-colors duration-150 hover:bg-neutro-75 hover:text-neutro-900"
          >
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </div>
  );
}
