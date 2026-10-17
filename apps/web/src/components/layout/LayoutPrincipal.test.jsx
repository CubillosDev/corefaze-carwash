import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { LayoutPrincipal } from '@/components/layout/LayoutPrincipal';

function renderizarLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LayoutPrincipal />}>
          <Route index element={<p>Contenido de la página</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function abrirMenu() {
  return userEvent.click(screen.getByRole('button', { name: 'Abrir menú de navegación' }));
}

function velo() {
  return document.querySelector('button[aria-hidden="true"]');
}

describe('LayoutPrincipal', () => {
  it('dibuja el contenido de la ruta dentro del área principal', () => {
    renderizarLayout();

    const principal = screen.getByRole('main');

    expect(within(principal).getByText('Contenido de la página')).toBeInTheDocument();
  });

  it('ofrece un enlace para saltar al contenido', () => {
    renderizarLayout();

    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#contenido-principal',
    );
  });

  it('mantiene el cajón fuera del documento mientras está cerrado', () => {
    renderizarLayout();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menú de navegación' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('abre el cajón de navegación desde el botón de menú', async () => {
    renderizarLayout();

    await abrirMenu();

    const cajon = screen.getByRole('dialog', { name: 'Menú de navegación' });

    expect(cajon).toHaveAttribute('aria-modal', 'true');
    expect(within(cajon).getByRole('link', { name: 'Inicio' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menú de navegación' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('cierra el cajón con Escape y devuelve el foco al botón de menú', async () => {
    renderizarLayout();

    const botonMenu = screen.getByRole('button', { name: 'Abrir menú de navegación' });
    await abrirMenu();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(botonMenu).toHaveFocus();
  });

  it('cierra el cajón al elegir una opción del menú', async () => {
    renderizarLayout();

    await abrirMenu();
    const cajon = screen.getByRole('dialog', { name: 'Menú de navegación' });
    await userEvent.click(within(cajon).getByRole('link', { name: 'Inicio' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cierra el cajón con el velo y con su botón de cerrar', async () => {
    renderizarLayout();

    await abrirMenu();
    await userEvent.click(velo());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await abrirMenu();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar menú de navegación' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('bloquea el desplazamiento de la página mientras el cajón está abierto', async () => {
    renderizarLayout();

    await abrirMenu();
    expect(document.body).toHaveStyle({ overflow: 'hidden' });

    await userEvent.keyboard('{Escape}');
    expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
  });
});
