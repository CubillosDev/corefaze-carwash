import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { Boton } from '@/components/ui/Boton';
import { etiquetaDeRol } from '@/constants/permisos';
import { useSesion } from '@/features/autenticacion/hooks/useSesion';
import { useTeclaEscape } from '@/hooks/useTeclaEscape';

/** "Diego Urbano" -> "DU"; con una sola palabra, su inicial. */
function iniciales(nombre) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Menú de perfil de la cabecera: nombre, rol y "Cerrar sesión".
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
        className="bg-white/12 text-detalle font-semibold"
      >
        {iniciales(usuario.nombre)}
      </Boton>

      {abierto ? (
        <div
          id={idPanel}
          className="absolute top-full right-0 z-60 mt-2 flex w-64 flex-col gap-3 rounded-tarjeta bg-white p-4 shadow-modal"
        >
          <div className="min-w-0">
            <p className="truncate text-titulo-tarjeta text-neutro-900">{usuario.nombre}</p>
            <p className="truncate text-meta text-neutro-600">{usuario.email}</p>
            <p className="mt-1 text-meta font-semibold text-primario-800">
              {etiquetaDeRol(usuario.rol)}
            </p>
          </div>

          <Boton
            variante="secundario"
            tamano="pequeno"
            className="w-full"
            onClick={() => {
              cerrar();
              cerrarSesion();
            }}
          >
            Cerrar sesión
          </Boton>
        </div>
      ) : null}
    </div>
  );
}
