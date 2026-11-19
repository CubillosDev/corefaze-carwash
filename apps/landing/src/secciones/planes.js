import { formatoPrecio } from '@/utils/formatoPrecio';
import { animar } from '@/utils/movimiento';

/** Selector mensual / anual de los planes (el anual tiene 15 % de descuento). */
export function iniciarPlanes() {
  const selector = document.querySelector('[data-facturacion]');
  const opciones = [...selector.querySelectorAll('[data-periodo-opcion]')];
  const precios = [...document.querySelectorAll('[data-precio]')];
  const notas = [...document.querySelectorAll('[data-nota-anual]')];

  opciones.forEach((opcion) =>
    opcion.addEventListener('click', () => {
      const periodo = opcion.dataset.periodoOpcion;
      if (selector.dataset.periodo === periodo) return;
      const anual = periodo === 'anual';

      selector.dataset.periodo = periodo;
      opciones.forEach((otra) => otra.setAttribute('aria-pressed', String(otra === opcion)));
      precios.forEach((precio) => {
        precio.textContent = formatoPrecio(Number(precio.dataset.mensual), anual);
        animar(precio, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], {
          duration: 360,
          easing: 'ease-out',
        });
      });
      notas.forEach((nota) => {
        nota.textContent = anual ? 'Facturado anualmente' : '';
      });
    }),
  );
}
