import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '@/features/autenticacion/api/autenticacion.api';
import { ProveedorSesion } from '@/features/autenticacion/components/ProveedorSesion';
import { RegistroPage } from '@/features/autenticacion/pages/RegistroPage';
import { ErrorHttp } from '@/lib/httpCliente';

vi.mock('@/features/autenticacion/api/autenticacion.api', () => ({ registrarCuenta: vi.fn(), iniciarSesion: vi.fn() }));

function renderizar() {
  return render(
    <ProveedorSesion>
      <MemoryRouter initialEntries={['/registro']}>
        <Routes>
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/ingreso" element={<p>Pantalla de ingreso</p>} />
        </Routes>
      </MemoryRouter>
    </ProveedorSesion>,
  );
}

async function llenar(usuarioEvento, { confirmacion = 'clave-segura-1' } = {}) {
  await usuarioEvento.type(screen.getByLabelText(/nombre completo/i), 'Ana Prueba');
  await usuarioEvento.type(screen.getByLabelText(/correo electrónico/i), 'ana@ejemplo.com');
  await usuarioEvento.type(screen.getByLabelText(/^contraseña/i), 'clave-segura-1');
  await usuarioEvento.type(screen.getByLabelText(/^confirmar contraseña/i), confirmacion);
  await usuarioEvento.click(screen.getByRole('button', { name: 'Solicitar acceso' }));
}

beforeEach(() => {
  api.registrarCuenta.mockReset();
});

afterEach(() => {
  window.sessionStorage.clear();
});

describe('RegistroPage', () => {
  it('envía la solicitud y explica que la cuenta espera aprobación', async () => {
    const usuarioEvento = userEvent.setup();
    api.registrarCuenta.mockResolvedValue({ id: 9, nombre: 'Ana Prueba', email: 'ana@ejemplo.com', rol: 'pendiente' });
    renderizar();

    await llenar(usuarioEvento);

    expect(api.registrarCuenta).toHaveBeenCalledWith({ nombre: 'Ana Prueba', email: 'ana@ejemplo.com', password: 'clave-segura-1' });
    expect(await screen.findByRole('heading', { name: 'Solicitud enviada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir a ingresar/i })).toHaveAttribute('href', '/ingreso');
  });

  it('no envía si la confirmación no coincide', async () => {
    const usuarioEvento = userEvent.setup();
    renderizar();

    await llenar(usuarioEvento, { confirmacion: 'otra-clave-9' });

    expect(screen.getByText('Las contraseñas no coinciden.')).toBeInTheDocument();
    expect(api.registrarCuenta).not.toHaveBeenCalled();
  });

  it('muestra el mensaje de la API si el correo ya tiene cuenta', async () => {
    const usuarioEvento = userEvent.setup();
    api.registrarCuenta.mockRejectedValue(new ErrorHttp('Ya existe un usuario con ese correo electrónico', { estado: 409 }));
    renderizar();

    await llenar(usuarioEvento);

    expect(await screen.findByText('Ya existe un usuario con ese correo electrónico')).toBeInTheDocument();
  });
});
