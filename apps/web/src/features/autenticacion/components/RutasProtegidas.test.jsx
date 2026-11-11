import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { rutas } from '@/app/router';
import { ProveedorSesion } from '@/features/autenticacion/components/ProveedorSesion';
import { useSesion } from '@/features/autenticacion/hooks/useSesion';
import { httpCliente } from '@/lib/httpCliente';

const sesionDe = (rol) => ({
  usuario: { id: 7, nombre: 'Diego Urbano', email: 'diego@prueba.com', rol, activo: true },
  token: 'jwt-de-prueba',
});

function renderizarApp(direccion, sesionInicial) {
  const enrutador = createMemoryRouter(rutas, { initialEntries: [direccion] });
  render(
    <ProveedorSesion sesionInicial={sesionInicial}>
      <RouterProvider router={enrutador} />
    </ProveedorSesion>,
  );
  return enrutador;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('rutas privadas', () => {
  it('sin sesión, cualquier ruta privada lleva a /ingreso', async () => {
    const enrutador = renderizarApp('/clientes', undefined);

    expect(await screen.findByRole('heading', { name: /ingresar a carwash/i })).toBeInTheDocument();
    expect(enrutador.state.location.pathname).toBe('/ingreso');
    expect(enrutador.state.location.state).toEqual({ desde: '/clientes' });
  });

  it('con sesión de un rol operativo muestra el panel con menú y cabecera', async () => {
    renderizarApp('/', sesionDe('administrador'));

    expect(await screen.findByRole('heading', { name: /panel de gestión/i })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Menú' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Perfil de Diego Urbano' })).toBeInTheDocument();
  });

  it('con una sesión activa, /ingreso redirige al inicio', async () => {
    const enrutador = renderizarApp('/ingreso', sesionDe('administrador'));

    expect(await screen.findByRole('heading', { name: /panel de gestión/i })).toBeInTheDocument();
    expect(enrutador.state.location.pathname).toBe('/');
  });

  it('un rol sin permiso para el módulo ve "Sin permiso" dentro del panel', async () => {
    renderizarApp('/reportes', sesionDe('soporte'));

    expect(await screen.findByRole('heading', { name: 'Sin permiso' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Menú' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
  });

  it('una dirección inexistente sigue siendo la 404 y no "Sin permiso"', async () => {
    renderizarApp('/esto-no-existe', sesionDe('soporte'));

    expect(screen.queryByRole('heading', { name: 'Sin permiso' })).not.toBeInTheDocument();
    expect(await screen.findByRole('navigation', { name: 'Menú' })).toBeInTheDocument();
  });

  it('una cuenta pendiente ve la pantalla de aprobación y no el panel', async () => {
    renderizarApp('/', sesionDe('pendiente'));

    expect(
      await screen.findByRole('heading', { name: /tu cuenta está pendiente de aprobación/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Menú' })).not.toBeInTheDocument();
  });

  it('el menú lateral solo muestra los módulos que el rol puede usar', async () => {
    renderizarApp('/', sesionDe('soporte'));

    const menu = await screen.findByRole('navigation', { name: 'Menú' });
    expect(menu).toHaveTextContent('Inicio');
  });
});

describe('menú de perfil', () => {
  it('muestra nombre, rol y cierra la sesión devolviendo al ingreso', async () => {
    const usuarioEvento = userEvent.setup();
    const enrutador = renderizarApp('/', sesionDe('administrador'));

    await usuarioEvento.click(await screen.findByRole('button', { name: 'Perfil de Diego Urbano' }));

    expect(screen.getByText('Diego Urbano')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();

    await usuarioEvento.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('heading', { name: /ingresar a carwash/i })).toBeInTheDocument();
    expect(enrutador.state.location.pathname).toBe('/ingreso');
  });

  it('se cierra con Escape y devuelve el foco al botón', async () => {
    const usuarioEvento = userEvent.setup();
    renderizarApp('/', sesionDe('administrador'));
    const boton = await screen.findByRole('button', { name: 'Perfil de Diego Urbano' });

    await usuarioEvento.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');

    await usuarioEvento.keyboard('{Escape}');

    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveFocus();
  });

  it('se cierra al hacer clic fuera', async () => {
    const usuarioEvento = userEvent.setup();
    renderizarApp('/', sesionDe('administrador'));
    const boton = await screen.findByRole('button', { name: 'Perfil de Diego Urbano' });

    await usuarioEvento.click(boton);
    await usuarioEvento.click(document.body);

    expect(boton).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('sesión vencida (401)', () => {
  it('cierra la sesión, redirige a /ingreso y avisa que la sesión terminó', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ mensaje: 'Token expirado' }), { status: 401 })),
    );
    const enrutador = renderizarApp('/', sesionDe('administrador'));
    await screen.findByRole('heading', { name: /panel de gestión/i });

    await act(async () => {
      await httpCliente.obtener('vehiculos').catch(() => {});
    });

    expect(await screen.findByRole('heading', { name: /ingresar a carwash/i })).toBeInTheDocument();
    expect(screen.getByText('Tu sesión terminó')).toBeInTheDocument();
    expect(enrutador.state.location.pathname).toBe('/ingreso');
  });
});

describe('ProveedorSesion', () => {
  it('el token viaja en las solicitudes mientras hay sesión y deja de viajar al cerrarla', async () => {
    const fetchSimulado = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSimulado);
    let cerrar;
    function CapturaCerrar() {
      cerrar = useSesion().cerrarSesion;
      return null;
    }
    render(
      <ProveedorSesion sesionInicial={sesionDe('administrador')}>
        <CapturaCerrar />
      </ProveedorSesion>,
    );

    await httpCliente.obtener('vehiculos');
    expect(fetchSimulado.mock.calls[0][1].headers.Authorization).toBe('Bearer jwt-de-prueba');

    act(() => cerrar());
    await httpCliente.obtener('vehiculos');
    expect(fetchSimulado.mock.calls[1][1].headers).not.toHaveProperty('Authorization');
  });
});
