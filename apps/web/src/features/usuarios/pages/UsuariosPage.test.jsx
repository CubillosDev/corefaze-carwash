import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProveedorSesion } from '@/features/autenticacion';
import { asignarRol, cambiarEstadoUsuario, listarUsuarios } from '@/features/usuarios/api/usuarios.api';
import { UsuariosPage } from '@/features/usuarios/pages/UsuariosPage';
import { CONSULTA_PANTALLA_ANGOSTA } from '@/hooks/usePantallaAngosta';
import { ErrorHttp } from '@/lib/httpCliente';

vi.mock('@/features/usuarios/api/usuarios.api', () => ({
  listarUsuarios: vi.fn(),
  cambiarEstadoUsuario: vi.fn(),
  asignarRol: vi.fn(),
}));

const YO = { id: 1, nombre: 'Ana Admin', email: 'ana@prueba.co', rol: 'superadmin', activo: true, creadoEn: '2026-10-01T15:00:00Z' };
const PENDIENTE = { id: 2, nombre: 'Beto Nuevo', email: 'beto@prueba.co', rol: 'pendiente', activo: true, creadoEn: '2026-11-18T15:00:00Z' };
const SOPORTE = { id: 3, nombre: 'Carla Caja', email: 'carla@prueba.co', rol: 'soporte', activo: true, creadoEn: '2026-11-02T15:00:00Z' };

const pagina = (usuarios, total = usuarios.length) => ({ usuarios, total, pagina: 1, porPagina: 10, totalPaginas: 1 });

function renderizar(rol = 'superadmin') {
  render(
    <ProveedorSesion sesionInicial={{ usuario: { ...YO, rol }, token: 't' }}>
      <UsuariosPage />
    </ProveedorSesion>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarUsuarios.mockImplementation(async (filtros) =>
    filtros.rol === 'pendiente' ? pagina([PENDIENTE]) : pagina([YO, PENDIENTE, SOPORTE]),
  );
});

describe('UsuariosPage', () => {
  it('lista las cuentas con su rol y avisa cuántas esperan aprobación', async () => {
    renderizar();

    expect(await screen.findByText('Beto Nuevo')).toBeInTheDocument();
    expect(screen.getByText('Pendiente de aprobación')).toBeInTheDocument();
    expect(screen.getByText('1 cuenta espera aprobación')).toBeInTheDocument();
    expect(screen.getByText('Tu cuenta')).toBeInTheDocument();
  });

  it('aprueba una cuenta pendiente con el rol elegido', async () => {
    const usuario = userEvent.setup();
    asignarRol.mockResolvedValue({ ...PENDIENTE, rol: 'soporte' });
    renderizar();

    const fila = (await screen.findByText('Beto Nuevo')).closest('tr');
    await usuario.click(within(fila).getByRole('button', { name: 'Aprobar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Aprobar a Beto Nuevo' });
    expect(within(dialogo).getByRole('button', { name: 'Aprobar con este rol' })).toBeDisabled();

    await usuario.click(within(dialogo).getByRole('radio', { name: /soporte/i }));
    await usuario.click(within(dialogo).getByRole('button', { name: 'Aprobar con este rol' }));

    expect(asignarRol).toHaveBeenCalledWith(2, 'soporte');
    expect(await screen.findByText('Beto Nuevo ahora es soporte')).toBeInTheDocument();
  });

  it('desactiva una cuenta tras confirmar y muestra el rechazo de la API', async () => {
    const usuario = userEvent.setup();
    cambiarEstadoUsuario.mockRejectedValueOnce(new ErrorHttp('No puede quedar el sistema sin ningún superadmin activo', { estado: 409 }));
    renderizar();

    const fila = (await screen.findByText('Carla Caja')).closest('tr');
    await usuario.click(within(fila).getByRole('button', { name: 'Desactivar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Desactivar a Carla Caja' });
    await usuario.click(within(dialogo).getByRole('button', { name: 'Desactivar' }));

    expect(cambiarEstadoUsuario).toHaveBeenCalledWith(3, false);
    expect(await within(dialogo).findByText('No puede quedar el sistema sin ningún superadmin activo')).toBeInTheDocument();
  });

  it('el administrador consulta sin acciones de gestión', async () => {
    renderizar('administrador');

    expect(await screen.findByText('Carla Caja')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument();
    expect(screen.queryByText('1 cuenta espera aprobación')).not.toBeInTheDocument();
  });

  it('en pantalla angosta muestra una tarjeta por cuenta con sus acciones', async () => {
    vi.stubGlobal('matchMedia', (consulta) => ({
      matches: consulta === CONSULTA_PANTALLA_ANGOSTA,
      media: consulta,
      addEventListener() {},
      removeEventListener() {},
    }));
    renderizar();

    const lista = await screen.findByRole('list', { name: 'Cuentas del panel' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    const tarjeta = within(lista).getByText('Beto Nuevo').closest('li');
    expect(within(tarjeta).getByRole('button', { name: 'Aprobar' })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it('filtra por rol en el servidor y vuelve a la primera página', async () => {
    const usuario = userEvent.setup();
    renderizar();
    await screen.findByText('Beto Nuevo');

    await usuario.click(screen.getByRole('button', { name: /^Soporte/ }));

    const filtros = listarUsuarios.mock.calls.map(([consulta]) => consulta).filter((consulta) => consulta.rol === 'soporte');
    expect(filtros.at(-1)).toMatchObject({ rol: 'soporte', pagina: 1 });
  });
});
