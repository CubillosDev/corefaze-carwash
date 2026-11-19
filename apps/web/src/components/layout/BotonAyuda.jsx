import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { CampoBusqueda } from '@/components/ui/CampoBusqueda';
import { IconoAuriculares } from '@/components/ui/iconos/IconoAuriculares';
import { IconoAyuda } from '@/components/ui/iconos/IconoAyuda';
import { IconoCerrar } from '@/components/ui/iconos/IconoCerrar';
import { IconoFlechaAbajo } from '@/components/ui/iconos/IconoFlechaAbajo';
import { PREGUNTAS_FRECUENTES } from '@/constants/ayuda';
import { useTeclaEscape } from '@/hooks/useTeclaEscape';
import { textoBuscable } from '@/utils/textoBuscable';

/**
 * Botón flotante de ayuda del diseño, abajo a la derecha: abre un panel con
 * las preguntas frecuentes y un buscador. El diseño también tenía un chat
 * con soporte; no existe un servicio de soporte detrás, así que solo van las
 * preguntas.
 */
export function BotonAyuda() {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [desplegada, setDesplegada] = useState(null);
  const panel = useRef(null);
  const boton = useRef(null);
  const idTitulo = useId();
  const idPanel = useId();

  const cerrar = useCallback(() => {
    setAbierto(false);
    boton.current?.focus();
  }, []);

  useTeclaEscape(abierto, cerrar);

  useEffect(() => {
    if (abierto) {
      panel.current?.querySelector('input')?.focus();
    }
  }, [abierto]);

  const texto = textoBuscable(busqueda);
  const preguntas = PREGUNTAS_FRECUENTES.filter(
    (item) => texto === '' || textoBuscable(item.pregunta).includes(texto) || textoBuscable(item.respuesta).includes(texto),
  );

  return (
    <div className="fixed right-4 bottom-5 z-60 flex flex-col items-end gap-2.5 escritorio:right-7 escritorio:bottom-10">
      {abierto ? (
        <section
          ref={panel}
          id={idPanel}
          role="dialog"
          aria-labelledby={idTitulo}
          className="flex h-[min(520px,calc(100dvh-110px))] w-90 max-w-[calc(100vw-32px)] origin-bottom-right animate-entrar-ayuda flex-col overflow-hidden rounded-panel border border-neutro-200 bg-white text-neutro-900 shadow-ayuda escritorio:h-[min(540px,calc(100dvh-150px))]"
        >
          <header className="flex items-center gap-2.5 px-4 pt-4">
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-neutro-900 text-white">
              <IconoAuriculares className="size-4.25" />
            </span>
            <span className="min-w-0 flex-1">
              <h2 id={idTitulo} className="text-titulo-tarjeta">
                Soporte Corefaze
              </h2>
              <span className="block text-nota text-neutro-600">Preguntas frecuentes del panel</span>
            </span>
            <button
              type="button"
              aria-label="Cerrar la ayuda"
              onClick={cerrar}
              className="inline-flex size-7.5 items-center justify-center rounded-opcion bg-neutro-100 text-neutro-700 transition-colors duration-150 hover:bg-neutro-150"
            >
              <IconoCerrar className="size-3.5" />
            </button>
          </header>

          <div className="px-4 pt-3">
            <CampoBusqueda
              etiqueta="Buscar en preguntas frecuentes"
              marcador="Buscar en preguntas frecuentes"
              valor={busqueda}
              alCambiar={setBusqueda}
            />
          </div>

          <ul className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pt-2 pb-1">
            {preguntas.map((item) => {
              const abierta = desplegada === item.pregunta;
              const idRespuesta = `${idPanel}-${PREGUNTAS_FRECUENTES.indexOf(item)}`;
              return (
                <li key={item.pregunta} className={`rounded-bloque transition-colors duration-150 ${abierta ? 'bg-neutro-75' : ''}`}>
                  <button
                    type="button"
                    aria-expanded={abierta}
                    aria-controls={idRespuesta}
                    onClick={() => setDesplegada(abierta ? null : item.pregunta)}
                    className="flex w-full items-center gap-2.5 px-2.5 py-2.75 text-left text-control font-semibold"
                  >
                    <span className="min-w-0 flex-1">{item.pregunta}</span>
                    <IconoFlechaAbajo
                      className={`size-3.25 shrink-0 text-neutro-450 transition-transform duration-200 ${abierta ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {abierta ? (
                    <p id={idRespuesta} className="px-2.5 pb-3 text-detalle leading-apoyo text-neutro-700">
                      {item.respuesta}
                    </p>
                  ) : null}
                </li>
              );
            })}
            {preguntas.length === 0 ? (
              <li className="px-2.5 py-5 text-center text-detalle text-neutro-450">No encontramos esa pregunta.</li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls={abierto ? idPanel : undefined}
        onClick={() => (abierto ? cerrar() : setAbierto(true))}
        className={`inline-flex h-11 items-center gap-2.25 rounded-tarjeta border pr-4 pl-3 text-cuerpo font-semibold shadow-boton-flotante transition-[transform,background-color,color] duration-180 hover:-translate-y-0.5 active:scale-97 ${
          abierto ? 'border-neutro-900 bg-neutro-900 text-white' : 'border-neutro-275 bg-white text-neutro-900'
        }`}
      >
        <span
          aria-hidden="true"
          className={`inline-flex size-6 items-center justify-center rounded-opcion text-white ${abierto ? 'bg-white/14' : 'bg-primario'}`}
        >
          {abierto ? <IconoCerrar className="size-3.5" /> : <IconoAyuda className="size-3.5" />}
        </span>
        {abierto ? 'Cerrar' : 'Ayuda'}
      </button>
    </div>
  );
}
