import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { IconoCerrar } from '@/components/ui/iconos/IconoCerrar';
import { useBloqueoDeScroll } from '@/hooks/useBloqueoDeScroll';
import { useFocoAtrapado } from '@/hooks/useFocoAtrapado';

const ANCHOS = {
  pequeno: 'escritorio:max-w-md',
  mediano: 'escritorio:max-w-lg',
  // Formularios de registro, como "Nuevo servicio" en el diseño (540 px).
  formulario: 'escritorio:max-w-135',
  grande: 'escritorio:max-w-2xl',
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
 * @param {string} [props.descripcion] Línea de apoyo bajo el título.
 * @param {'pequeno'|'mediano'|'formulario'|'grande'} [props.tamano]
 * @param {import('react').ReactNode} [props.pie] Contenido del pie: botones de
 *   acción alineados a la derecha. Un bloque con flex-1 queda a la izquierda.
 * @param {import('react').ReactNode} props.children
 */
export function Modal({ abierto, alCerrar, titulo, descripcion, tamano = 'mediano', pie, children }) {
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
    <div className="fixed inset-0 z-80 flex items-end justify-center escritorio:items-center escritorio:p-5">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={alCerrar}
        className="absolute inset-0 animate-aparecer bg-velo backdrop-blur-velo"
      />

      <div
        ref={contenedor}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        onKeyDown={manejarTecla}
        className={`relative flex max-h-[92dvh] w-full animate-entrar-modal flex-col overflow-hidden rounded-t-panel bg-white shadow-modal escritorio:rounded-modal ${
          ANCHOS[tamano] ?? ANCHOS.mediano
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-neutro-100 px-5.5 pt-4.5 pb-3.5">
          <div className="min-w-0">
            <h2 id={idTitulo} className="text-titulo-modal text-neutro-900">
              {titulo}
            </h2>
            {descripcion ? (
              <p className="mt-0.5 text-detalle text-neutro-600">{descripcion}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={alCerrar}
            aria-label="Cerrar ventana"
            className="inline-flex size-7.5 shrink-0 items-center justify-center rounded-opcion text-neutro-500 transition-colors duration-150 hover:bg-neutro-75"
          >
            <IconoCerrar className="size-3.75" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5.5 pt-4 pb-4.5 text-control text-neutro-700">
          {children}
        </div>

        {pie ? (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-neutro-150 bg-neutro-25 px-5.5 py-3.25">
            {pie}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
