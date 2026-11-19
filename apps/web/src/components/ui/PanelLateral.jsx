import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { IconoCerrar } from '@/components/ui/iconos/IconoCerrar';
import { useBloqueoDeScroll } from '@/hooks/useBloqueoDeScroll';
import { useFocoAtrapado } from '@/hooks/useFocoAtrapado';

/**
 * Panel de detalle que entra por la derecha ("Detalle del cliente" en el
 * diseño). Como el modal, atrapa el foco, lo devuelve al cerrar y se cierra con
 * Escape, con su botón o haciendo clic en el velo. En pantallas angostas ocupa
 * todo el ancho.
 *
 * @param {object} props
 * @param {boolean} props.abierto
 * @param {() => void} props.alCerrar
 * @param {string} props.titulo
 * @param {import('react').ReactNode} [props.pie] Acciones fijas al pie.
 * @param {import('react').ReactNode} props.children
 */
export function PanelLateral({ abierto, alCerrar, titulo, pie, children }) {
  const contenedor = useRef(null);
  const idTitulo = useId();

  useBloqueoDeScroll(abierto);
  useFocoAtrapado(contenedor, abierto);

  if (!abierto) {
    return null;
  }

  function manejarTecla(evento) {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      alCerrar();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-80">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={alCerrar}
        className="absolute inset-0 animate-aparecer bg-velo-suave"
      />

      <div
        ref={contenedor}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onKeyDown={manejarTecla}
        className="absolute inset-y-0 right-0 flex w-full animate-entrar-lateral flex-col bg-white text-neutro-900 shadow-panel-lateral escritorio:w-panel-lateral"
      >
        <div className="flex items-center justify-between border-b border-neutro-150 px-4.5 py-4">
          <h2 id={idTitulo} className="text-titulo-tarjeta">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar panel"
            className="inline-flex size-8 items-center justify-center rounded-opcion bg-neutro-100 text-neutro-700 transition-colors duration-150 hover:bg-neutro-150"
          >
            <IconoCerrar className="size-3.75" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4.5 py-5">{children}</div>

        {pie ? <div className="flex gap-2 border-t border-neutro-150 px-4.5 py-3.5">{pie}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
