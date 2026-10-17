import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { IconoCerrar } from '@/components/ui/iconos/IconoCerrar';
import { useBloqueoDeScroll } from '@/hooks/useBloqueoDeScroll';
import { useFocoAtrapado } from '@/hooks/useFocoAtrapado';

const ANCHOS = {
  pequeno: 'sm:max-w-md',
  mediano: 'sm:max-w-lg',
  grande: 'sm:max-w-2xl',
};

/**
 * Ventana modal del sistema de diseño.
 *
 * Se dibuja con un portal sobre el body, atrapa el foco mientras está abierta
 * y lo devuelve al elemento que la abrió. Se cierra con Escape, con el botón
 * de cerrar o haciendo clic por fuera.
 *
 * En pantallas angostas aparece anclada abajo, como hoja, para quedar al
 * alcance del pulgar.
 *
 * @param {object} props
 * @param {boolean} props.abierto
 * @param {() => void} props.alCerrar
 * @param {string} props.titulo
 * @param {'pequeno'|'mediano'|'grande'} [props.tamano]
 * @param {import('react').ReactNode} [props.pie] Botones de acción al pie.
 * @param {import('react').ReactNode} props.children
 */
export function Modal({ abierto, alCerrar, titulo, tamano = 'mediano', pie, children }) {
  const contenedor = useRef(null);
  const idTitulo = useId();

  useBloqueoDeScroll(abierto);
  useFocoAtrapado(contenedor, abierto);

  if (!abierto) {
    return null;
  }

  // Se detiene la propagación para que Escape cierre solo esta ventana y no
  // también la capa que haya debajo (por ejemplo, el cajón de navegación).
  function manejarTecla(evento) {
    if (evento.key === 'Escape') {
      evento.stopPropagation();
      alCerrar();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={alCerrar}
        className="absolute inset-0 animate-aparecer bg-neutro-900/60"
      />

      <div
        ref={contenedor}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onKeyDown={manejarTecla}
        className={`relative flex max-h-[92dvh] w-full animate-subir flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl ${
          ANCHOS[tamano] ?? ANCHOS.mediano
        }`}
      >
        <div className="flex items-start gap-4 border-b border-neutro-200 px-5 py-4">
          <h2 id={idTitulo} className="min-w-0 flex-1 text-lg font-semibold text-neutro-900">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar ventana"
            className="-m-1 shrink-0 rounded-lg p-1 text-neutro-500 transition-colors hover:bg-neutro-100 hover:text-neutro-800"
          >
            <IconoCerrar />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-sm text-neutro-700">
          {children}
        </div>

        {pie ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-neutro-200 bg-neutro-50 px-5 py-4">
            {pie}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
