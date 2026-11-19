import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LayoutPrincipal } from '@/components/layout/LayoutPrincipal';
import { ProveedorSesion } from '@/features/autenticacion';
import { CONSULTA_PANTALLA_ANGOSTA } from '@/hooks/usePantallaAngosta';

/** Simula el ancho de la ventana y permite cruzar el punto de quiebre. */
function simularPantalla({ angosta }) {
  const oyentes = new Set();
  let coincide = angosta;

  vi.stubGlobal('matchMedia', (consulta) => ({
    get matches() {
      return consulta === CONSULTA_PANTALLA_ANGOSTA && coincide;
    },
    media: consulta,
    addEventListener: (_tipo, oyente) => oyentes.add(oyente),
    removeEventListener: (_tipo, oyente) => oyentes.delete(oyente),
  }));

  return {
    cambiarA(nuevoValor) {
      coincide = nuevoValor;
      act(() => oyentes.forEach((oyente) => oyente()));
    },
  };
}

const SESION_ADMIN = {
  usuario: { id: 1, nombre: 'Ana Prueba', email: 'ana@prueba.com', rol: 'administrador' },
  token: 'token-de-prueba',
};

function renderizarLayout() {
  return render(
    <ProveedorSesion sesionInicial={SESION_ADMIN}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LayoutPrincipal />}>
            <Route index element={<p>Contenido de la página</p>} />
            <Route path="*" element={<p>Otra página</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ProveedorSesion>,
  );
}

const botonMenu = () => screen.getByRole('button', { name: 'Abrir menú de navegación' });
const barraLateral = () => document.querySelector('aside');
const velo = () => document.querySelector('button[aria-hidden="true"]');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LayoutPrincipal: estructura', () => {
  it('dibuja la cabecera del diseño con el logo y el nombre de la aplicación', () => {
    renderizarLayout();

    const cabecera = screen.getByRole('banner');

    expect(within(cabecera).getByRole('img', { name: 'Corefaze' })).toBeInTheDocument();
    expect(within(cabecera).getByText('CarWash')).toBeInTheDocument();
  });

  it('dibuja el contenido de la ruta dentro del área principal', () => {
    renderizarLayout();

    expect(within(screen.getByRole('main')).getByText('Contenido de la página')).toBeInTheDocument();
  });

  it('ofrece un enlace para saltar al contenido', () => {
    renderizarLayout();

    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#contenido-principal',
    );
  });

  it('lleva el área de contenido arriba al cambiar de página', async () => {
    renderizarLayout();

    const principal = screen.getByRole('main');
    const asignaciones = [];
    Object.defineProperty(principal, 'scrollTop', {
      configurable: true,
      get: () => 0,
      set: (valor) => {
        asignaciones.push(valor);
      },
    });

    await userEvent.click(screen.getByRole('link', { name: 'Sistema de diseño' }));

    expect(screen.getByText('Otra página')).toBeInTheDocument();
    expect(asignaciones).toContain(0);
  });
});

describe('LayoutPrincipal: escritorio', () => {
  it('deja la barra lateral fija y alcanzable, sin convertirla en cajón', () => {
    simularPantalla({ angosta: false });
    renderizarLayout();

    expect(barraLateral()).not.toHaveAttribute('inert');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('LayoutPrincipal: pantalla angosta', () => {
  it('empieza con el cajón cerrado e inerte', () => {
    simularPantalla({ angosta: true });
    renderizarLayout();

    expect(barraLateral()).toHaveAttribute('inert');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(botonMenu()).toHaveAttribute('aria-expanded', 'false');
    expect(botonMenu()).toHaveAttribute('aria-controls', barraLateral().id);
  });

  it('abre el cajón como diálogo modal y lleva el foco adentro', async () => {
    simularPantalla({ angosta: true });
    renderizarLayout();

    await userEvent.click(botonMenu());

    const cajon = screen.getByRole('dialog', { name: 'Menú de navegación' });
    expect(cajon).toHaveAttribute('aria-modal', 'true');
    expect(cajon).not.toHaveAttribute('inert');
    expect(botonMenu()).toHaveAttribute('aria-expanded', 'true');
    expect(within(cajon).getByRole('button', { name: 'Cerrar menú' })).toHaveFocus();
  });

  it('cierra el cajón con Escape y devuelve el foco al botón de menú', async () => {
    simularPantalla({ angosta: true });
    renderizarLayout();

    await userEvent.click(botonMenu());
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(barraLateral()).toHaveAttribute('inert');
    expect(botonMenu()).toHaveFocus();
  });

  it('cierra el cajón al elegir una opción del menú', async () => {
    simularPantalla({ angosta: true });
    renderizarLayout();

    await userEvent.click(botonMenu());
    const cajon = screen.getByRole('dialog', { name: 'Menú de navegación' });
    await userEvent.click(within(cajon).getByRole('link', { name: 'Inicio' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cierra el cajón con el velo y con su botón de cerrar', async () => {
    simularPantalla({ angosta: true });
    renderizarLayout();

    await userEvent.click(botonMenu());
    await userEvent.click(velo());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(botonMenu());
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar menú' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cierra el cajón si la ventana cruza a escritorio y no lo reabre al volver', async () => {
    const pantalla = simularPantalla({ angosta: true });
    renderizarLayout();

    await userEvent.click(botonMenu());
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    pantalla.cambiarA(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(barraLateral()).not.toHaveAttribute('inert');

    pantalla.cambiarA(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(barraLateral()).toHaveAttribute('inert');
  });
});
