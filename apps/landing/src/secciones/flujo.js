import { animar, CURVA, observarVisibilidad, reducirMovimiento } from '@/utils/movimiento';

const CADA_PASO_MS = 5000;
const PAUSA_TRAS_TOCAR_MS = 10000;

function animarEscena(escenario, escena) {
  const contenedor = escenario.querySelector('[data-escena-contenedor]');
  const entrar = (elemento, opciones, desde = 'translateY(8px)') =>
    animar(elemento, [{ opacity: 0, transform: desde }, { opacity: 1, transform: 'none' }], {
      easing: CURVA,
      fill: 'backwards',
      ...opciones,
    });

  entrar(contenedor, { duration: 520 }, 'translateY(16px) scale(0.98)');
  escenario
    .querySelectorAll('[data-satelite]:not([hidden]) .satelite__tarjeta')
    .forEach((tarjeta, i) => entrar(tarjeta, { duration: 560, delay: 380 + i * 160 }));
  escena.querySelectorAll('[data-mini]').forEach((mini, i) => entrar(mini, { duration: 420, delay: 250 + i * 90 }));
  escena.querySelectorAll('[data-barra]').forEach((barra, i) =>
    animar(barra, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
      duration: 800,
      delay: 200 + i * 70,
      easing: CURVA,
      fill: 'backwards',
    }),
  );
  entrar(escena.querySelector('[data-pagado]'), { duration: 500, delay: 1100 }, 'translateY(10px)');
  animar(
    escena.querySelector('[data-movil]'),
    [
      { transform: 'translateX(0)', offset: 0 },
      { transform: 'translateX(0)', offset: 0.15 },
      { transform: 'translateX(calc(100% + 26px))', offset: 0.45 },
      { transform: 'translateX(calc(100% + 26px))', offset: 0.6 },
      { transform: 'translateX(calc(200% + 52px))', offset: 0.9 },
      { transform: 'translateX(calc(200% + 52px))', offset: 1 },
    ],
    { duration: 4600, easing: CURVA, fill: 'both' },
  );
}

/**
 * "Cómo funciona": cuatro pasos que avanzan solos cada 5 s (con barra de
 * progreso). Si la persona elige uno, el avance automático espera 10 s.
 */
export function iniciarFlujo() {
  const pasos = [...document.querySelectorAll('[data-paso]')];
  const escenario = document.querySelector('.flujo__escenario');
  const escenas = [...document.querySelectorAll('[data-escena]')];
  const satelites = [...document.querySelectorAll('[data-satelite]')];
  let actual = 0;
  let tocadoEn = 0;
  let visible = false;

  const mostrar = (indice) => {
    actual = indice;
    pasos.forEach((paso, i) => {
      paso.setAttribute('aria-expanded', String(i === indice));
      paso.classList.remove('paso--corriendo');
    });
    if (!reducirMovimiento()) {
      void pasos[indice].offsetWidth;
      pasos[indice].classList.add('paso--corriendo');
    }
    escenas.forEach((escena, i) => {
      escena.hidden = i !== indice;
    });
    satelites.forEach((satelite) => {
      satelite.hidden = satelite.dataset.satelite !== String(indice);
    });
    animarEscena(escenario, escenas[indice]);
  };

  pasos.forEach((paso, i) =>
    paso.addEventListener('click', () => {
      tocadoEn = Date.now();
      mostrar(i);
    }),
  );

  observarVisibilidad(escenario, (siVisible) => {
    visible = siVisible;
  });

  mostrar(0);
  if (reducirMovimiento()) return;

  setInterval(() => {
    if (!visible || document.hidden || Date.now() - tocadoEn < PAUSA_TRAS_TOCAR_MS) return;
    mostrar((actual + 1) % pasos.length);
  }, CADA_PASO_MS);
}
