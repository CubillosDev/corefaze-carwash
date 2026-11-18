import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProveedorSesion } from '@/features/autenticacion';
import { crearServicio, eliminarServicio, listarServicios } from '@/features/servicios/api/servicios.api';
import { ServiciosPage } from '@/features/servicios/pages/ServiciosPage';

vi.mock('@/features/servicios/api/servicios.api', () => ({
  listarServicios: vi.fn(),
  crearServicio: vi.fn(),
  actualizarServicio: vi.fn(),
  eliminarServicio: vi.fn(),
}));

const SERVICIO = {
  id: 1,
  numero: 1,
  nombre: 'Lavado de prueba',
  descripcion: 'Exterior',
  categoria: 'lavado',
  activo: true,
  tarifas: [{ tipoVehiculo: 'automovil', valor: 22000 }],
};

function renderizar(rol = 'administrador') {
  render(
    <ProveedorSesion sesionInicial={{ usuario: { id: 1, nombre: 'Ana', email: 'a@prueba.co', rol }, token: 't' }}>
      <ServiciosPage />
    </ProveedorSesion>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarServicios.mockResolvedValue([SERVICIO]);
});

describe('ServiciosPage', () => {
  it('muestra las tarifas tal como las guarda la API', async () => {
    renderizar();

    const fila = (await screen.findAllByRole('row'))[1];
    expect(within(fila).getByText('Lavado de prueba')).toBeInTheDocument();
    expect(within(fila).getByText('$ 22.000')).toBeInTheDocument();
  });

  it('registra un servicio con solo las tarifas escritas', async () => {
    crearServicio.mockResolvedValue({ ...SERVICIO, id: 2 });
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo servicio' }));
    const dialogo = screen.getByRole('dialog', { name: 'Nuevo servicio' });
    await userEvent.type(within(dialogo).getByLabelText(/Número/), '20');
    await userEvent.type(within(dialogo).getByLabelText(/^Nombre/), 'Servicio nuevo');
    await userEvent.type(within(dialogo).getByLabelText('Camioneta'), '30000');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    expect(crearServicio).toHaveBeenCalledWith({
      numero: 20,
      nombre: 'Servicio nuevo',
      activo: true,
      tarifas: [{ tipoVehiculo: 'camioneta', valor: 30000 }],
    });
  });

  it('pide confirmación para eliminar', async () => {
    eliminarServicio.mockResolvedValue(undefined);
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));

    expect(eliminarServicio).toHaveBeenCalledWith(1);
  });

  it('soporte no ve las acciones de gestión', async () => {
    renderizar('soporte');

    await screen.findAllByRole('row');
    expect(screen.queryByRole('button', { name: 'Nuevo servicio' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
  });
});
