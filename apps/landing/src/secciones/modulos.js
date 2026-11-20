import { MODULOS } from '@/constants/modulos';
import { animar, CURVA } from '@/utils/movimiento';

const CAPTURAS = import.meta.glob('/src/assets/images/capturas/*.webp', { eager: true, query: '?url', import: 'default' });
const rutaCaptura = (nombre, ancho) => CAPTURAS[`/src/assets/images/capturas/${nombre}-${ancho}.webp`];

/**
 * Pestañas de la sección "Módulos" (patrón ARIA de pestañas, con flechas):
 * cambian el texto y la captura del panel real.
 */
export function iniciarModulos() {
  const pestanas = [...document.querySelectorAll('[data-modulo]')];
  const panel = document.querySelector('[data-modulos-panel]');
  const texto = document.querySelector('[data-modulo-texto]');
  const contador = document.querySelector('[data-modulo-contador]');
  const titulo = document.querySelector('[data-modulo-titulo]');
  const descripcion = document.querySelector('[data-modulo-descripcion]');
  const vinetas = document.querySelector('[data-modulo-vinetas]');
  const etiqueta = document.querySelector('[data-modulo-etiqueta]');
  const captura = document.querySelector('[data-modulo-captura]');

  const elegir = (pestana) => {
    const clave = pestana.dataset.modulo;
    const modulo = MODULOS[clave];
    const indice = pestanas.indexOf(pestana);

    pestanas.forEach((otra) => {
      const elegida = otra === pestana;
      otra.setAttribute('aria-selected', String(elegida));
      otra.tabIndex = elegida ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', pestana.id);

    contador.textContent = `0${indice + 1} de ${pestanas.length}`;
    titulo.textContent = modulo.titulo;
    descripcion.textContent = modulo.descripcion;
    vinetas.replaceChildren(
      ...modulo.vinetas.map((vineta) => {
        const item = document.createElement('li');
        item.textContent = vineta;
        return item;
      }),
    );
    etiqueta.textContent = modulo.etiqueta;

    captura.srcset = `${rutaCaptura(modulo.captura, 720)} 720w, ${rutaCaptura(modulo.captura, 1440)} 1440w`;
    captura.src = rutaCaptura(modulo.captura, 1440);
    captura.alt = `Módulo ${modulo.etiqueta} de Corefaze`;
    captura.decode?.().then(
      () => animar(captura, [{ opacity: 0.4 }, { opacity: 1 }], { duration: 300 }),
      () => {},
    );
    animar(texto, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], {
      duration: 420,
      easing: CURVA,
    });
  };

  pestanas.forEach((pestana) => pestana.addEventListener('click', () => elegir(pestana)));

  document.querySelector('[data-modulos-pestanas]').addEventListener('keydown', (evento) => {
    const desplazamiento = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
    const actual = pestanas.indexOf(document.activeElement);
    if (!desplazamiento || actual < 0) return;
    evento.preventDefault();
    const siguiente = pestanas[(actual + desplazamiento + pestanas.length) % pestanas.length];
    siguiente.focus();
    elegir(siguiente);
  });
}
