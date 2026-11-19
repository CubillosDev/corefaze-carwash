import { CURVA, reducirMovimiento } from '@/utils/movimiento';

const CLAVE = 'corefaze-landing-theme';
const COLOR_BARRA = { claro: '#ffffff', oscuro: '#0a1020' };

const temaActual = () => (document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro');

function aplicar(tema, boton) {
  if (tema === 'oscuro') document.documentElement.dataset.tema = 'oscuro';
  else delete document.documentElement.dataset.tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLOR_BARRA[tema]);
  boton.title = tema === 'oscuro' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
}

function guardar(tema) {
  try {
    localStorage.setItem(CLAVE, tema === 'oscuro' ? 'dark' : 'light');
  } catch {
    /* Sin almacenamiento: el tema dura solo esta visita. */
  }
}

/**
 * Cambia el tema con un revelado circular desde el botón (View Transitions).
 * Sin soporte o con movimiento reducido, cambia de inmediato.
 */
export function iniciarTema() {
  const boton = document.querySelector('[data-tema-boton]');
  aplicar(temaActual(), boton);

  boton.addEventListener('click', (evento) => {
    const siguiente = temaActual() === 'claro' ? 'oscuro' : 'claro';
    guardar(siguiente);

    if (!document.startViewTransition || reducirMovimiento()) {
      aplicar(siguiente, boton);
      return;
    }

    const x = evento.clientX || window.innerWidth - 120;
    const y = evento.clientY || 40;
    const sinTransiciones = document.createElement('style');
    sinTransiciones.textContent = '*{transition:none!important}';

    const transicion = document.startViewTransition(() => {
      document.head.append(sinTransiciones);
      aplicar(siguiente, boton);
    });
    transicion.finished.finally(() => sinTransiciones.remove());
    transicion.ready
      .then(() => {
        const radio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radio}px at ${x}px ${y}px)`] },
          { duration: 650, easing: CURVA, pseudoElement: '::view-transition-new(root)' },
        );
      })
      .catch(() => {});
  });
}
