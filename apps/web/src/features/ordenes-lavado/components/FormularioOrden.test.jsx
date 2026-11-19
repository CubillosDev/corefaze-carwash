import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listarClientes } from '@/features/clientes/api/clientes.api';
import { listarColaboradores } from '@/features/colaboradores/api/colaboradores.api';
import { crearOrden } from '@/features/ordenes-lavado/api/ordenesLavado.api';
import { FormularioOrden } from '@/features/ordenes-lavado/components/FormularioOrden';
import { listarServicios } from '@/features/servicios/api/servicios.api';
import { listarVehiculos } from '@/features/vehiculos/api/vehiculos.api';
import { ErrorHttp } from '@/lib/httpCliente';

vi.mock('@/features/vehiculos/api/vehiculos.api', () => ({ listarVehiculos: vi.fn() }));
vi.mock('@/features/servicios/api/servicios.api', () => ({ listarServicios: vi.fn() }));
vi.mock('@/features/colaboradores/api/colaboradores.api', () => ({ listarColaboradores: vi.fn() }));
vi.mock('@/features/clientes/api/clientes.api', () => ({ listarClientes: vi.fn() }));
vi.mock('@/features/ordenes-lavado/api/ordenesLavado.api', () => ({ crearOrden: vi.fn() }));

function renderizar() {
  const alCrear = vi.fn();
  render(
    <MemoryRouter>
      <FormularioOrden alCerrar={vi.fn()} alCrear={alCrear} />
    </MemoryRouter>,
  );
  return alCrear;
}

async function llenarFormulario() {
  await userEvent.type(await screen.findByLabelText(/Placa/), 'aaa111');
  await userEvent.click(screen.getByRole('radio', { name: /Lavado de prueba/ }));
  await userEvent.click(screen.getByRole('radio', { name: /Colaborador Activo/ }));
  await userEvent.type(screen.getByLabelText(/Turno/), '3');
}

beforeEach(() => {
  vi.clearAllMocks();
  listarVehiculos.mockResolvedValue([{ id: 7, placa: 'AAA111', marca: 'Marca Prueba', color: null, tipoVehiculo: 'automovil' }]);
  listarServicios.mockResolvedValue([
    { id: 1, numero: 1, nombre: 'Lavado de prueba', descripcion: 'Exterior', categoria: 'lavado', activo: true },
    { id: 2, numero: 2, nombre: 'Servicio inactivo', categoria: 'lavado', activo: false },
  ]);
  listarColaboradores.mockResolvedValue([
    { id: 3, codigo: 401, nombre: 'Colaborador Activo', estado: 'activo' },
    { id: 4, codigo: 402, nombre: 'Colaborador Inactivo', estado: 'inactivo' },
  ]);
  listarClientes.mockResolvedValue([]);
});

describe('FormularioOrden', () => {
  it('solo ofrece servicios activos y colaboradores activos', async () => {
    renderizar();

    expect(await screen.findByRole('radio', { name: /Lavado de prueba/ })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Servicio inactivo/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Colaborador Inactivo/ })).not.toBeInTheDocument();
  });

  it('completa el vehículo con la placa registrada', async () => {
    renderizar();

    await userEvent.type(await screen.findByLabelText(/Placa/), 'aaa-111');

    expect(screen.getByText('Marca Prueba · Automóvil')).toBeInTheDocument();
  });

  it('envía solo lo que escribe la persona: sin valor ni estado', async () => {
    crearOrden.mockResolvedValue({ id: 99, valor: 22000 });
    const alCrear = renderizar();

    await llenarFormulario();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar orden' }));

    expect(crearOrden).toHaveBeenCalledWith({
      turno: 3,
      vehiculoId: 7,
      servicioId: 1,
      colaboradorId: 3,
      medioPago: 'efectivo',
    });
    expect(alCrear).toHaveBeenCalledWith({ id: 99, valor: 22000 });
  });

  it('sin jornada abierta muestra el aviso de la API con el enlace a jornadas', async () => {
    crearOrden.mockRejectedValue(
      new ErrorHttp('No hay una jornada abierta para registrar órdenes', { estado: 409 }),
    );
    renderizar();

    await llenarFormulario();
    await userEvent.click(screen.getByRole('button', { name: 'Registrar orden' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent('No hay una jornada abierta para registrar órdenes');
    expect(within(aviso).getByRole('link', { name: 'Ir a jornadas' })).toHaveAttribute('href', '/jornadas');
  });

  it('marca el formato de la placa sin llamar a la API', async () => {
    renderizar();

    await llenarFormulario();
    await userEvent.clear(screen.getByLabelText(/Placa/));
    await userEvent.type(screen.getByLabelText(/Placa/), 'AB12');
    await userEvent.click(screen.getByRole('button', { name: 'Registrar orden' }));

    expect(screen.getByText(/ABC123 \(carro\)/)).toBeInTheDocument();
    expect(crearOrden).not.toHaveBeenCalled();
  });
});
