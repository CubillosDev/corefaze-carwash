import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { IconoPuntos } from '@/components/ui/iconos/IconoPuntos';
import { Punto } from '@/components/ui/Punto';
import { etiquetaEstadoOrden, tonoEstadoOrden } from '@/constants/etiquetas';
import { useTeclaEscape } from '@/hooks/useTeclaEscape';
import { siguientesEstados } from '@/utils/estadosOrden';

const ALTO_ENCABEZADO_MENU = 40;
const ALTO_OPCION = 30;

/**
 * Botón "⋯" de una tarjeta con el menú "Mover a": el estado actual y los
 * estados permitidos. Se cierra con Escape (el foco vuelve al botón) o al
 * hacer clic por fuera.
 *
 * @param {object} props
 * @param {string} props.estado
 * @param {string} props.descripcion Para el nombre accesible ("la orden de AAA 111").
 * @param {boolean} props.puedeAnular
 * @param {boolean} [props.deshabilitado]
 * @param {(estado: string) => void} props.alElegir
 * @param {(abierto: boolean) => void} [props.alAbrirOCerrar]
 */
export function MenuMoverOrden({ estado, descripcion, puedeAnular, deshabilitado = false, alElegir, alAbrirOCerrar }) {
  const [abierto, setAbierto] = useState(false);
  const [haciaArriba, setHaciaArriba] = useState(false);
  const contenedor = useRef(null);
  const boton = useRef(null);
  const idMenu = useId();
  const opciones = siguientesEstados(estado, puedeAnular);

  // Dentro de una columna que se desplaza, el menú se abre hacia arriba si no
  // cabe debajo del botón; así no queda cortado en las últimas tarjetas.
  function alternar() {
    if (!abierto) {
      const caja = boton.current.getBoundingClientRect();
      const borde = boton.current.closest('[data-desplazable]')?.getBoundingClientRect().bottom ?? window.innerHeight;
      setHaciaArriba(borde - caja.bottom < ALTO_ENCABEZADO_MENU + (opciones.length + 1) * ALTO_OPCION);
    }
    cambiarAbierto(!abierto);
  }

  const cambiarAbierto = useCallback(
    (valor) => {
      setAbierto(valor);
      alAbrirOCerrar?.(valor);
    },
    [alAbrirOCerrar],
  );

  const cerrarYEnfocar = useCallback(() => {
    cambiarAbierto(false);
    boton.current?.focus();
  }, [cambiarAbierto]);

  useTeclaEscape(abierto, cerrarYEnfocar);

  useEffect(() => {
    if (!abierto) {
      return undefined;
    }
    contenedor.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus();

    function cerrarSiClicFuera(evento) {
      if (!contenedor.current?.contains(evento.target)) {
        cambiarAbierto(false);
      }
    }
    document.addEventListener('pointerdown', cerrarSiClicFuera);
    return () => document.removeEventListener('pointerdown', cerrarSiClicFuera);
  }, [abierto, cambiarAbierto]);

  if (opciones.length === 0) {
    return null;
  }

  return (
    <div ref={contenedor} className="relative z-10 -mr-1">
      <button
        ref={boton}
        type="button"
        aria-label={`Cambiar el estado de ${descripcion}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idMenu : undefined}
        disabled={deshabilitado}
        onClick={alternar}
        className="inline-flex size-6 items-center justify-center rounded-placa text-neutro-500 transition-colors duration-150 hover:bg-neutro-100 hover:text-neutro-900 disabled:opacity-40"
      >
        <IconoPuntos />
      </button>

      {abierto ? (
        <div
          id={idMenu}
          role="menu"
          aria-label="Mover a"
          className={`absolute right-0 z-40 w-46 animate-aparecer rounded-menu border border-neutro-200 bg-white p-1.25 shadow-menu ${
            haciaArriba ? 'bottom-7.5' : 'top-7.5'
          }`}
        >
          <p aria-hidden="true" className="px-2 pt-1.5 pb-1 text-etiqueta-menu text-neutro-450 uppercase">
            Mover a
          </p>
          <button
            type="button"
            role="menuitem"
            disabled
            className="flex h-7.5 w-full items-center gap-2 rounded-opcion px-2 text-left text-detalle font-semibold text-neutro-900"
          >
            <Punto tono={tonoEstadoOrden(estado)} />
            <span className="flex-1">{etiquetaEstadoOrden(estado)}</span>
            <span className="text-micro font-normal text-neutro-450">Actual</span>
          </button>
          {opciones.map((siguiente) => (
            <button
              key={siguiente}
              type="button"
              role="menuitem"
              onClick={() => {
                cambiarAbierto(false);
                alElegir(siguiente);
              }}
              className="flex h-7.5 w-full items-center gap-2 rounded-opcion px-2 text-left text-detalle text-neutro-900 transition-colors duration-150 hover:bg-neutro-75 focus-visible:bg-neutro-75"
            >
              <Punto tono={tonoEstadoOrden(siguiente)} />
              <span className="flex-1">{etiquetaEstadoOrden(siguiente)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
