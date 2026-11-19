import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProveedorSesion } from '@/features/autenticacion/components/ProveedorSesion';
import { IngresoPage } from '@/features/autenticacion/pages/IngresoPage';
import * as api from '@/features/autenticacion/api/autenticacion.api';
import { ErrorHttp } from '@/lib/httpCliente';

vi.mock('@/features/autenticacion/api/autenticacion.api', () => ({
  iniciarSesion: vi.fn(),
  MENSAJE_CREDENCIALES_INCORRECTAS: 'Usuario o contraseña incorrectos',
}));

const USUARIO = { id: 1, nombre: 'Ana Prueba', email: 'ana@prueba.com', rol: 'administrador', activo: true };

function renderizar(entrada = '/ingreso') {
  return render(
    <ProveedorSesion>
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/ingreso" element={<IngresoPage />} />
          <Route path="/" element={<p>Pantalla de inicio</p>} />
          <Route path="/vehiculos" element={<p>Pantalla de vehículos</p>} />
        </Routes>
      </MemoryRouter>
    </ProveedorSesion>,
  );
}

async function escribirYEnviar(usuarioEvento, { email = 'ana@prueba.com', password = 'ClaveSegura2026' } = {}) {
  if (email) await usuarioEvento.type(screen.getByLabelText(/correo electrónico/i), email);
  if (password) await usuarioEvento.type(screen.getByLabelText(/^contraseña/i), password);
  await usuarioEvento.click(screen.getByRole('button', { name: 'Ingresar' }));
}

beforeEach(() => {
  api.iniciarSesion.mockReset();
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('IngresoPage', () => {
  it('muestra el formulario de ingreso con correo, contraseña y botón "Ingresar"', () => {
    renderizar();

    expect(screen.getByRole('heading', { name: /ingresar a carwash/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/^contraseña/i)).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });

  it('muestra y vuelve a ocultar la contraseña', async () => {
    const usuarioEvento = userEvent.setup();
    renderizar();
    const campo = screen.getByLabelText(/^contraseña/i);
    const alternar = screen.getByRole('button', { name: 'Mostrar contraseña' });

    expect(alternar).toHaveAttribute('aria-pressed', 'false');
    await usuarioEvento.click(alternar);
    expect(campo).toHaveAttribute('type', 'text');
    expect(alternar).toHaveAttribute('aria-pressed', 'true');

    await usuarioEvento.click(alternar);
    expect(campo).toHaveAttribute('type', 'password');
  });

  it('valida el formulario sin llamar a la API', async () => {
    const usuarioEvento = userEvent.setup();
    renderizar();

    await usuarioEvento.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(screen.getByText('Escribe tu correo electrónico.')).toBeInTheDocument();
    expect(screen.getByText('Escribe tu contraseña.')).toBeInTheDocument();
    expect(api.iniciarSesion).not.toHaveBeenCalled();
  });

  it('entra al inicio con credenciales correctas', async () => {
    api.iniciarSesion.mockResolvedValue({ usuario: USUARIO, token: 'jwt-de-prueba' });
    const usuarioEvento = userEvent.setup();
    renderizar();

    await escribirYEnviar(usuarioEvento);

    expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument();
    expect(api.iniciarSesion).toHaveBeenCalledWith({
      email: 'ana@prueba.com',
      password: 'ClaveSegura2026',
    });
  });

  it('vuelve a la dirección a la que la persona quería ir', async () => {
    api.iniciarSesion.mockResolvedValue({ usuario: USUARIO, token: 'jwt' });
    const usuarioEvento = userEvent.setup();
    render(
      <ProveedorSesion>
        <MemoryRouter initialEntries={[{ pathname: '/ingreso', state: { desde: '/vehiculos' } }]}>
          <Routes>
            <Route path="/ingreso" element={<IngresoPage />} />
            <Route path="/vehiculos" element={<p>Pantalla de vehículos</p>} />
          </Routes>
        </MemoryRouter>
      </ProveedorSesion>,
    );

    await escribirYEnviar(usuarioEvento);

    expect(await screen.findByText('Pantalla de vehículos')).toBeInTheDocument();
  });

  it('no sigue destinos externos ni protocolo-relativos guardados en el estado', async () => {
    api.iniciarSesion.mockResolvedValue({ usuario: USUARIO, token: 'jwt' });
    const usuarioEvento = userEvent.setup();
    render(
      <ProveedorSesion>
        <MemoryRouter initialEntries={[{ pathname: '/ingreso', state: { desde: '//sitio-malo.com' } }]}>
          <Routes>
            <Route path="/ingreso" element={<IngresoPage />} />
            <Route path="/" element={<p>Pantalla de inicio</p>} />
          </Routes>
        </MemoryRouter>
      </ProveedorSesion>,
    );

    await escribirYEnviar(usuarioEvento);

    expect(await screen.findByText('Pantalla de inicio')).toBeInTheDocument();
  });

  it('muestra el mensaje único ante credenciales incorrectas y limpia la contraseña', async () => {
    api.iniciarSesion.mockRejectedValue(
      new ErrorHttp('Usuario o contraseña incorrectos', { estado: 401 }),
    );
    const usuarioEvento = userEvent.setup();
    renderizar();

    await escribirYEnviar(usuarioEvento);

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos');
    expect(screen.getByLabelText(/^contraseña/i)).toHaveValue('');
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveValue('ana@prueba.com');
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
  });

  it('deshabilita el botón mientras envía para no duplicar el ingreso', async () => {
    let resolver;
    api.iniciarSesion.mockReturnValue(new Promise((resolverPromesa) => (resolver = resolverPromesa)));
    const usuarioEvento = userEvent.setup();
    renderizar();

    await escribirYEnviar(usuarioEvento);

    const boton = screen.getByRole('button', { name: 'Ingresar' });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAttribute('aria-busy', 'true');

    resolver({ usuario: USUARIO, token: 'jwt' });
    await waitFor(() => expect(screen.getByText('Pantalla de inicio')).toBeInTheDocument());
  });

  it('guarda el respaldo solo en sessionStorage: nunca en localStorage ni en cookies', async () => {
    api.iniciarSesion.mockResolvedValue({ usuario: USUARIO, token: 'jwt-secreto-de-prueba' });
    const usuarioEvento = userEvent.setup();
    renderizar();

    await escribirYEnviar(usuarioEvento);
    await screen.findByText('Pantalla de inicio');

    expect(window.localStorage).toHaveLength(0);
    expect(window.sessionStorage.getItem('corefaze.sesion')).toContain('jwt-secreto-de-prueba');
    expect(document.cookie).not.toContain('jwt-secreto-de-prueba');
    window.sessionStorage.clear();
  });
});
