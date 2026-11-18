import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProveedorSesion } from '@/features/autenticacion';
import {
  cambiarEstadoColaborador,
  crearColaborador,
  listarColaboradores,
} from '@/features/colaboradores/api/colaboradores.api';
import { ColaboradoresPage } from '@/features/colaboradores/pages/ColaboradoresPage';

vi.mock('@/features/colaboradores/api/colaboradores.api', () => ({
  listarColaboradores: vi.fn(),
  crearColaborador: vi.fn(),
  actualizarColaborador: vi.fn(),
  cambiarEstadoColaborador: vi.fn(),
}));

const ACTIVO = {
  id: 1,
  codigo: 401,
  nombre: 'Colaborador Prueba',
  documento: '1020300401',
  telefono: '3010000401',
  porcentajeComision: 0.37,
  tipoVinculacion: 'fijo',
  estado: 'activo',
};

function renderizar() {
  render(
    <ProveedorSesion sesionInicial={{ usuario: { id: 1, nombre: 'Ana', email: 'a@prueba.co', rol: 'administrador' }, token: 't' }}>
      <ColaboradoresPage />
    </ProveedorSesion>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarColaboradores.mockResolvedValue([ACTIVO]);
});

describe('ColaboradoresPage', () => {
  it('muestra la comisión con formato de porcentaje', async () => {
    renderizar();

    const fila = (await screen.findAllByRole('row'))[1];
    expect(within(fila).getByText('37 %')).toBeInTheDocument();
    expect(within(fila).getByText('301 000 0401')).toBeInTheDocument();
  });

  it('desactiva con confirmación (no se borra)', async () => {
    cambiarEstadoColaborador.mockResolvedValue({ ...ACTIVO, estado: 'inactivo' });
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Desactivar' }));
    const dialogo = screen.getByRole('dialog', { name: 'Desactivar a Colaborador Prueba' });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desactivar' }));

    expect(cambiarEstadoColaborador).toHaveBeenCalledWith(1, 'inactivo');
    expect(await screen.findByRole('button', { name: 'Activar' })).toBeInTheDocument();
  });

  it('registra un colaborador enviando la comisión como fracción', async () => {
    crearColaborador.mockResolvedValue({ ...ACTIVO, id: 2, codigo: 402, nombre: 'Otro Colaborador' });
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo colaborador' }));
    const dialogo = screen.getByRole('dialog', { name: 'Nuevo colaborador' });
    await userEvent.type(within(dialogo).getByLabelText(/Código/), '402');
    await userEvent.type(within(dialogo).getByLabelText(/Nombre/), 'Otro Colaborador');
    await userEvent.type(within(dialogo).getByLabelText(/Documento/), '1020300402');
    await userEvent.type(within(dialogo).getByLabelText(/Teléfono/), '3010000402');
    await userEvent.type(within(dialogo).getByLabelText(/Comisión/), '40');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    expect(crearColaborador).toHaveBeenCalledWith(expect.objectContaining({ codigo: 402, porcentajeComision: 0.4 }));
  });
});
