import { animar, CURVA, CURVA_SALIDA, observarVisibilidad, reducirMovimiento } from '@/utils/movimiento';

const PALABRAS = ['lavadero.', 'patio.', 'caja.', 'equipo.', 'inventario.'];
const CADA_PALABRA_MS = 2800;
const RECORRIDO_INCLINACION_PX = 620;

/** Momento (ms) en que el teléfono pasa a cada fase; el ciclo dura 10,6 s. */
const FASES_MS = [0, 2300, 3700, 7400];
const CICLO_MS = 10600;

function letras(palabra) {
  return [...palabra].map((caracter) => {
    const letra = document.createElement('span');
    letra.className = 'hero__letra';
    letra.textContent = caracter;
    return letra;
  });
}

function iniciarPalabra(estado) {
  const caja = document.querySelector('[data-palabra-caja]');
  const palabra = document.querySelector('[data-palabra]');
  let indice = 0;

  const construir = (conEntrada) => {
    palabra.replaceChildren(...letras(PALABRAS[indice]));
    caja.style.width = `${palabra.scrollWidth}px`;
    if (!conEntrada) return;
    [...palabra.children].forEach((letra, i) =>
      animar(letra, [{ opacity: 0, transform: 'translateY(0.5em) rotateX(-80deg)' }, { opacity: 1, transform: 'none' }], {
        duration: 700,
        delay: i * 28,
        easing: CURVA_SALIDA,
        fill: 'backwards',
      }),
    );
  };

  construir(false);
  document.fonts?.ready.then(() => construir(false));
  if (reducirMovimiento()) return;

  setInterval(() => {
    if (document.hidden || !estado.visible) return;
    indice = (indice + 1) % PALABRAS.length;
    const salientes = [...palabra.children];
    salientes.forEach((letra, i) =>
      letra.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-0.4em) rotateX(70deg)' }], {
        duration: 320,
        delay: i * 18,
        easing: 'cubic-bezier(0.7, 0, 0.84, 0)',
        fill: 'forwards',
      }),
    );
    setTimeout(() => construir(true), 320 + salientes.length * 18);
  }, CADA_PALABRA_MS);
}

function iniciarInclinacion(estado) {
  const inclinacion = document.querySelector('[data-inclinacion]');
  if (reducirMovimiento()) {
    inclinacion.style.transform = 'none';
    return;
  }
  let pendiente = false;
  const inclinar = () => {
    pendiente = false;
    const avance = Math.min(1, Math.max(0, window.scrollY / RECORRIDO_INCLINACION_PX));
    inclinacion.style.transition = 'transform 120ms linear';
    inclinacion.style.transform = `rotateX(${(14 * (1 - avance)).toFixed(2)}deg) scale(${(0.94 + 0.06 * avance).toFixed(4)})`;
  };
  window.addEventListener(
    'scroll',
    () => {
      if (pendiente || !estado.visible) return;
      pendiente = true;
      requestAnimationFrame(inclinar);
    },
    { passive: true },
  );
  inclinar();
}

function iniciarTelefono(estado) {
  const telefono = document.querySelector('[data-telefono]');
  const pista = document.querySelector('[data-telefono-pista]');
  const hoja = document.querySelector('[data-telefono-hoja]');
  const boton = document.querySelector('[data-telefono-boton]');
  const aviso = document.querySelector('[data-aviso-patio]');
  const capturas = {
    inicio: document.querySelector('[data-captura="inicio"]'),
    ordenes: document.querySelector('[data-captura="ordenes"]'),
  };

  const mostrarCaptura = (nombre) =>
    Object.entries(capturas).forEach(([clave, imagen]) => imagen.classList.toggle('captura--activa', clave === nombre));

  const ponerFase = (fase) => {
    telefono.dataset.fase = String(fase);
    pista.textContent = fase === 0 ? 'Centra la placa en el recuadro' : 'Placa reconocida';
    boton.textContent = fase === 3 ? '✓ Ingresado al patio' : 'Ingresar al patio';
    aviso.hidden = fase !== 3;
    mostrarCaptura(fase === 3 ? 'ordenes' : 'inicio');

    if (fase === 0) animar(telefono, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 350 });
    if (fase === 1) animar(hoja, [{ transform: 'translateY(120%)' }, { transform: 'none' }], { duration: 420, easing: CURVA });
    if (fase === 2) {
      animar(telefono, [{ opacity: 0.3 }, { opacity: 1 }], { duration: 300 });
      telefono.querySelectorAll('[data-fila]').forEach((fila, i) =>
        animar(fila, [{ opacity: 0, transform: 'translateX(-10px)' }, { opacity: 1, transform: 'none' }], {
          duration: 380,
          delay: 150 + i * 330,
          easing: CURVA,
          fill: 'backwards',
        }),
      );
    }
    if (fase === 3) {
      animar(
        aviso,
        [
          { opacity: 0, transform: 'translateX(-50%) translateY(-12px) scale(0.96)' },
          { opacity: 1, transform: 'translateX(-50%)' },
        ],
        { duration: 480, easing: CURVA },
      );
      animar(boton, [{ transform: 'scale(0.92)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], {
        duration: 450,
        easing: CURVA,
      });
    }
  };

  if (reducirMovimiento()) {
    ponerFase(2);
    return;
  }

  let temporizadores = [];
  const ciclo = () => {
    temporizadores.forEach(clearTimeout);
    temporizadores = FASES_MS.map((momento, fase) => setTimeout(() => ponerFase(fase), momento));
    temporizadores.push(
      setTimeout(function seguir() {
        if (document.hidden || !estado.visible) {
          temporizadores.push(setTimeout(seguir, 1500));
          return;
        }
        ciclo();
      }, CICLO_MS),
    );
  };
  ciclo();
}

/**
 * Palabra rotativa del título, inclinación 3D del navegador al desplazarse y
 * el ciclo del teléfono: escanear la placa → detectada → datos autocompletados
 * → "Ingresado al patio" (el navegador pasa al tablero de órdenes y avisa).
 * Todo se pausa cuando el hero no está en pantalla.
 */
export function iniciarHero() {
  const estado = { visible: true };
  observarVisibilidad(document.querySelector('[data-hero-seccion]'), (visible) => {
    estado.visible = visible;
  });
  iniciarPalabra(estado);
  iniciarInclinacion(estado);
  iniciarTelefono(estado);
}
