import { animar } from '@/utils/movimiento';

/**
 * Sombra de la barra al desplazarse y menú desplegable en pantallas chicas.
 * El desplazamiento suave a cada sección lo hace el CSS (scroll-behavior).
 */
export function iniciarNavegacion() {
  const nav = document.querySelector('[data-nav]');
  const boton = document.querySelector('[data-menu-boton]');
  const menu = document.getElementById('menu-movil');

  let pendiente = false;
  const marcarDesplazamiento = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      nav.classList.toggle('nav--desplazada', window.scrollY > 30);
    });
  };
  window.addEventListener('scroll', marcarDesplazamiento, { passive: true });
  marcarDesplazamiento();

  const cerrar = () => {
    menu.hidden = true;
    boton.setAttribute('aria-expanded', 'false');
    boton.setAttribute('aria-label', 'Abrir menú');
  };

  boton.addEventListener('click', () => {
    if (!menu.hidden) {
      cerrar();
      return;
    }
    menu.hidden = false;
    boton.setAttribute('aria-expanded', 'true');
    boton.setAttribute('aria-label', 'Cerrar menú');
    animar(menu, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], {
      duration: 220,
      easing: 'ease-out',
    });
  });

  menu.addEventListener('click', (evento) => {
    if (evento.target.closest('a')) cerrar();
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && !menu.hidden) {
      cerrar();
      boton.focus();
    }
  });
}
