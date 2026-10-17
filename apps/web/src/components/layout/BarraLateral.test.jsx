import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

import { BarraLateral } from '@/components/layout/BarraLateral';
import { MENU_PRINCIPAL } from '@/constants/rutas';

function renderizarEn(ruta, propiedades = {}) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <BarraLateral {...propiedades} />
    </MemoryRouter>,
  );
}

const pildora = () => document.querySelector('[data-pildora]');

describe('BarraLateral', () => {
  it('nombra la navegación con su etiqueta "Menú"', () => {
    renderizarEn('/');

    expect(screen.getByRole('navigation', { name: 'Menú' })).toBeInTheDocument();
  });

  it('muestra una opción por cada entrada de MENU_PRINCIPAL, en orden', () => {
    renderizarEn('/');

    expect(screen.getAllByRole('link').map((enlace) => enlace.textContent)).toEqual(
      MENU_PRINCIPAL.map((entrada) => entrada.texto),
    );
  });

  it('marca la opción activa y lleva la píldora hasta su posición', () => {
    const indice = MENU_PRINCIPAL.findIndex((entrada) => entrada.texto === 'Sistema de diseño');
    renderizarEn(MENU_PRINCIPAL[indice].ruta);

    expect(screen.getByRole('link', { name: 'Sistema de diseño' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
    expect(pildora().style.transform).toBe(`translateY(calc(var(--spacing) * ${9 * indice}))`);
  });

  it('pone la píldora en la primera posición para Inicio', () => {
    renderizarEn('/');

    expect(pildora().style.transform).toBe('translateY(calc(var(--spacing) * 0))');
  });

  it('oculta la píldora cuando ninguna opción corresponde a la ruta', () => {
    renderizarEn('/ruta-que-no-existe');

    expect(pildora()).toBeNull();
  });

  it('avisa al elegir una opción', async () => {
    const alNavegar = vi.fn();
    renderizarEn('/', { alNavegar });

    await userEvent.click(screen.getByRole('link', { name: 'Inicio' }));

    expect(alNavegar).toHaveBeenCalledOnce();
  });
});
