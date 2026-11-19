import { useCallback, useEffect, useRef, useState } from 'react';

import { accionAlSoltar } from '@/utils/estadosOrden';

const UMBRAL_PX = 6;
const CURVA_SUAVE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
const CURVA_RESORTE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const ESCALA_LEVANTADA = 1.04;
const INCLINACION_MAXIMA = 6;
const MS_ATERRIZAJE = 360;

const reducirMovimiento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Anima con la Web Animations API; sin soporte o con movimiento reducido, termina de una vez. */
function animar(elemento, cuadros, opciones) {
  if (!elemento?.animate || reducirMovimiento()) {
    return Promise.resolve();
  }
  return elemento
    .animate(cuadros, { fill: 'forwards', ...opciones })
    .finished.catch(() => {});
}

const columnaEn = (x, y) =>
  document.elementFromPoint?.(x, y)?.closest('[data-columna]')?.getAttribute('data-columna') ?? null;

/** Una copia de la tarjeta que sigue al puntero. Es decorativa: no se lee ni recibe clics. */
function crearCopia(tarjeta, rect) {
  const capa = document.createElement('div');
  capa.setAttribute('aria-hidden', 'true');
  capa.className = 'pointer-events-none fixed top-0 left-0 z-50';
  capa.style.width = `${rect.width}px`;
  const copia = tarjeta.cloneNode(true);
  copia.querySelectorAll('[id]').forEach((elemento) => elemento.removeAttribute('id'));
  copia.classList.add('shadow-tarjeta-arrastrada', 'cursor-grabbing');
  capa.append(copia);
  document.body.append(capa);
  return { capa, copia };
}

/**
 * Arrastrar y soltar las tarjetas del tablero entre fases, con el mouse o un
 * lápiz (en pantallas táctiles se usa el menú "⋯"). Solo deja soltar en la
 * fase siguiente, o en Entregada para cobrar en caja (accionAlSoltar): la
 * tarjeta se levanta, sigue al puntero inclinándose con la velocidad, aterriza
 * en su nueva columna o vuelve a su lugar si el destino no es válido. Escape
 * cancela. Un arrastre nunca dispara el clic que abre el detalle.
 *
 * @param {object} opciones
 * @param {(orden: object, destino: string, accion: 'cambiar'|'cobrar') => (Promise<unknown>|void)} opciones.alSoltar
 * @param {(orden: object) => void} opciones.alRechazar Se soltó en una fase no permitida.
 * @returns {{
 *   arrastre: { ordenId: number, origen: string, destino: string|null, accion: string|null, alto: number } | null,
 *   recienMovida: number|null,
 *   alPresionarTarjeta: (evento: PointerEvent, orden: object) => void,
 * }}
 */
export function useArrastreOrdenes({ alSoltar, alRechazar }) {
  const [arrastre, setArrastre] = useState(null);
  const [recienMovida, setRecienMovida] = useState(null);
  const llamadas = useRef({ alSoltar, alRechazar });
  const gestoActual = useRef(null);

  useEffect(() => {
    llamadas.current = { alSoltar, alRechazar };
  }, [alSoltar, alRechazar]);

  useEffect(() => {
    if (recienMovida === null) {
      return undefined;
    }
    const temporizador = setTimeout(() => setRecienMovida(null), MS_ATERRIZAJE + 100);
    return () => clearTimeout(temporizador);
  }, [recienMovida]);

  useEffect(() => () => gestoActual.current?.terminar(), []);

  const alPresionarTarjeta = useCallback((evento, orden) => {
    if (evento.pointerType === 'touch' || evento.button !== 0 || evento.target.closest('button, [role="menu"]')) {
      return;
    }
    const tarjeta = evento.currentTarget;
    const g = { x: evento.clientX, y: evento.clientY, ultimoX: evento.clientX, inclinacion: 0, activo: false };

    const posicionar = () => {
      g.capa.style.translate = `${g.x - g.dx}px ${g.y - g.dy}px`;
      if (!reducirMovimiento()) {
        const objetivo = Math.max(-INCLINACION_MAXIMA, Math.min(INCLINACION_MAXIMA, (g.x - g.ultimoX) * 0.8));
        g.inclinacion += (objetivo - g.inclinacion) * 0.2;
        g.copia.style.rotate = `${g.inclinacion.toFixed(2)}deg`;
      }
      g.ultimoX = g.x;
      g.cuadro = requestAnimationFrame(posicionar);
    };

    const comenzar = () => {
      g.activo = true;
      g.rect = tarjeta.getBoundingClientRect();
      g.dx = evento.clientX - g.rect.left;
      g.dy = evento.clientY - g.rect.top;
      Object.assign(g, crearCopia(tarjeta, g.rect));
      document.body.classList.add('cursor-grabbing', 'select-none');
      posicionar();
      animar(g.copia, [{ scale: '1' }, { scale: String(ESCALA_LEVANTADA) }], { duration: 180, easing: CURVA_SUAVE });
      setArrastre({ ordenId: orden.id, origen: orden.estado, destino: null, accion: null, alto: g.rect.height });
    };

    const quitarEscuchas = () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', cancelar);
      window.removeEventListener('keydown', alTeclear);
    };

    const terminar = () => {
      quitarEscuchas();
      cancelAnimationFrame(g.cuadro);
      g.capa?.remove();
      document.body.classList.remove('cursor-grabbing', 'select-none');
      gestoActual.current = null;
    };

    // El clic que sigue a un arrastre no abre el detalle de la orden.
    const anularClicSiguiente = () => {
      const anular = (clic) => {
        clic.preventDefault();
        clic.stopPropagation();
      };
      window.addEventListener('click', anular, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', anular, { capture: true }), 0);
    };

    const volver = async () => {
      cancelAnimationFrame(g.cuadro);
      const opciones = { duration: 320, easing: CURVA_RESORTE };
      await Promise.all([
        animar(g.capa, [{ translate: g.capa.style.translate }, { translate: `${g.rect.left}px ${g.rect.top}px` }], opciones),
        animar(g.copia, [{ scale: String(ESCALA_LEVANTADA), rotate: g.copia.style.rotate || '0deg' }, { scale: '1', rotate: '0deg' }], opciones),
      ]);
      terminar();
      setArrastre(null);
    };

    const aterrizar = async (destino, accion) => {
      cancelAnimationFrame(g.cuadro);
      const hueco = document.querySelector(`[data-columna="${destino}"] [data-hueco]`)?.getBoundingClientRect();
      const opciones = { duration: 260, easing: CURVA_SUAVE };
      if (hueco) {
        await Promise.all([
          animar(g.capa, [{ translate: g.capa.style.translate }, { translate: `${hueco.left}px ${hueco.top}px` }], opciones),
          animar(g.copia, [{ scale: String(ESCALA_LEVANTADA), rotate: g.copia.style.rotate || '0deg' }, { scale: '1', rotate: '0deg' }], opciones),
        ]);
      }
      try {
        await llamadas.current.alSoltar(orden, destino, accion);
      } finally {
        terminar();
        setArrastre(null);
        if (accion === 'cambiar') {
          setRecienMovida(orden.id);
        }
      }
    };

    function mover(movimiento) {
      g.x = movimiento.clientX;
      g.y = movimiento.clientY;
      if (!g.activo) {
        if (Math.hypot(g.x - evento.clientX, g.y - evento.clientY) < UMBRAL_PX) {
          return;
        }
        comenzar();
      }
      const destino = columnaEn(g.x, g.y);
      if (destino !== g.destino) {
        g.destino = destino;
        const accion = accionAlSoltar(orden.estado, destino);
        setArrastre((anterior) => anterior && { ...anterior, destino, accion });
      }
    }

    function soltar() {
      quitarEscuchas();
      if (!g.activo) {
        gestoActual.current = null;
        return;
      }
      anularClicSiguiente();
      const accion = accionAlSoltar(orden.estado, g.destino);
      if (accion) {
        aterrizar(g.destino, accion);
        return;
      }
      if (g.destino && g.destino !== orden.estado) {
        llamadas.current.alRechazar(orden);
      }
      volver();
    }

    function cancelar() {
      quitarEscuchas();
      if (g.activo) {
        volver();
      } else {
        gestoActual.current = null;
      }
    }

    function alTeclear(tecla) {
      if (tecla.key === 'Escape') {
        cancelar();
      }
    }

    gestoActual.current = { terminar };
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', cancelar);
    window.addEventListener('keydown', alTeclear);
  }, []);

  return { arrastre, recienMovida, alPresionarTarjeta };
}
