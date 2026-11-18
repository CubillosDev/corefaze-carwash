import { createPortal } from 'react-dom';

import { IconoCerrar } from '@/components/ui/iconos/IconoCerrar';
import { IconoVisto } from '@/components/ui/iconos/IconoVisto';

const TONOS = {
  exito: { fondo: 'bg-exito-solido', Icono: IconoVisto },
  error: { fondo: 'bg-error', Icono: IconoCerrar },
};

/**
 * Aviso flotante abajo a la derecha que confirma una acción ("Orden
 * registrada"). Se anuncia a los lectores de pantalla sin mover el foco.
 * Quien lo usa decide cuándo desaparece (ver useAviso).
 *
 * @param {object} props
 * @param {{ mensaje: string, tono?: 'exito'|'error' } | null} props.aviso
 */
export function Aviso({ aviso }) {
  const tono = TONOS[aviso?.tono] ?? TONOS.exito;

  return createPortal(
    <div role="status" aria-live="polite" className="pointer-events-none fixed right-3 bottom-5.5 z-90 escritorio:right-5.5">
      {aviso ? (
        <div className="flex animate-entrar-vista items-center gap-2.5 rounded-menu bg-neutro-900 py-2.75 pr-4 pl-3 text-control font-medium text-white shadow-aviso">
          <span
            aria-hidden="true"
            className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full ${tono.fondo}`}
          >
            <tono.Icono className="size-3" />
          </span>
          {aviso.mensaje}
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
