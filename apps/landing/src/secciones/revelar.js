import { animar, CURVA, CURVA_SALIDA, reducirMovimiento } from '@/utils/movimiento';

function revelar(elemento) {
  const hermanos = [...(elemento.parentElement?.children ?? [])].filter((hijo) => hijo.hasAttribute('data-revelar'));
  elemento.style.opacity = '';
  animar(elemento, [{ opacity: 0, transform: 'translateY(32px) scale(0.985)' }, { opacity: 1, transform: 'none' }], {
    duration: 1000,
    delay: Math.max(0, hermanos.indexOf(elemento)) * 80,
    easing: CURVA_SALIDA,
    fill: 'backwards',
  });
  elemento.querySelectorAll('[data-crecer]').forEach((barra, i) =>
    animar(barra, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: 1100,
      delay: 300 + i * 120,
      easing: CURVA,
      fill: 'backwards',
    }),
  );
}

/**
 * Entrada del hero y aparición de cada bloque al llegar a él. Lo que ya está
 * en pantalla al cargar no se oculta; sin JavaScript todo queda visible.
 */
export function iniciarRevelado() {
  if (reducirMovimiento()) return;

  document.querySelectorAll('[data-hero]').forEach((elemento, i) =>
    elemento.animate(
      [
        { opacity: 0, transform: 'translateY(24px)', filter: 'blur(8px)' },
        { opacity: 1, transform: 'none', filter: 'blur(0)' },
      ],
      { duration: 1100, delay: 60 + i * 100, easing: CURVA_SALIDA, fill: 'backwards' },
    ),
  );

  const observador = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        observador.unobserve(entrada.target);
        revelar(entrada.target);
      }),
    { threshold: 0.08, rootMargin: '0px 0px -6% 0px' },
  );

  document.querySelectorAll('[data-revelar]').forEach((elemento) => {
    if (elemento.getBoundingClientRect().top > window.innerHeight) {
      elemento.style.opacity = '0';
      observador.observe(elemento);
    }
  });
}
