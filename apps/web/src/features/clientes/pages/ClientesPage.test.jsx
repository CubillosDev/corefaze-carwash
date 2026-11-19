import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProveedorSesion } from '@/features/autenticacion';
import { crearCliente, eliminarCliente, listarClientes } from '@/features/clientes/api/clientes.api';
import { ClientesPage } from '@/features/clientes/pages/ClientesPage';
import { listarOrdenes } from '@/features/ordenes-lavado/api/ordenesLavado.api';
import { listarServicios } from '@/features/servicios/api/servicios.api';
import { listarVehiculos } from '@/features/vehiculos/api/vehiculos.api';
import { ErrorHttp } from '@/lib/httpCliente';

vi.mock('@/features/clientes/api/clientes.api', () => ({
  listarClientes: vi.fn(),
  crearCliente: vi.fn(),
  actualizarCliente: vi.fn(),
  eliminarCliente: vi.fn(),
}));
vi.mock('@/features/vehiculos/api/vehiculos.api', () => ({ listarVehiculos: vi.fn() }));
vi.mock('@/features/servicios/api/servicios.api', () => ({ listarServicios: vi.fn() }));
vi.mock('@/features/ordenes-lavado/api/ordenesLavado.api', () => ({
  listarOrdenes: vi.fn(),
  listarOrdenesDeVehiculo: vi.fn(),
  crearOrden: vi.fn(),
  cambiarEstadoOrden: vi.fn(),
}));

const CLIENTES = [
  { id: 1, nombre: 'Ana Prueba', documento: '1000000001', tipo: 'particular', telefono: '3000000001', email: null, creditoHabilitado: false, estado: 'activo' },
  { id: 2, nombre: 'Empresa Ficticia', documento: '9000000002', tipo: 'empresa', telefono: '3000000002', email: null, creditoHabilitado: true, estado: 'activo' },
];

function renderizar(rol = 'administrador') {
  render(
    <ProveedorSesion sesionInicial={{ usuario: { id: 1, nombre: 'Ana', email: 'a@prueba.co', rol }, token: 't' }}>
      <ClientesPage />
    </ProveedorSesion>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarClientes.mockResolvedValue(CLIENTES);
  listarVehiculos.mockResolvedValue([{ id: 5, placa: 'AAA111', marca: 'Marca Prueba', tipoVehiculo: 'automovil', clienteId: 1 }]);
  listarServicios.mockResolvedValue([{ id: 1, numero: 1, nombre: 'Lavado de prueba' }]);
  listarOrdenes.mockResolvedValue({
    ordenes: [{ id: 9, vehiculoId: 5, servicioId: 1, fecha: '2026-08-03', valor: 22000, estado: 'entregada', creadaEn: '2026-08-03T13:00:00Z' }],
    totales: null,
  });
});

describe('ClientesPage', () => {
  it('lista los clientes con sus placas y teléfono agrupado', async () => {
    renderizar();

    const fila = await screen.findByRole('button', { name: 'Ver el detalle de Ana Prueba' });
    expect(within(fila).getByText('AAA 111')).toBeInTheDocument();
    expect(within(fila).getByText('300 000 0001')).toBeInTheDocument();
    expect(screen.getByText('2 clientes registrados')).toBeInTheDocument();
  });

  it('busca por placa y filtra por segmento', async () => {
    renderizar();
    await screen.findByRole('button', { name: 'Ver el detalle de Ana Prueba' });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar clientes' }), 'aaa 111');
    expect(screen.queryByRole('button', { name: 'Ver el detalle de Empresa Ficticia' })).not.toBeInTheDocument();

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar clientes' }));
    await userEvent.click(screen.getByRole('button', { name: 'Con crédito 1' }));
    expect(screen.getByRole('button', { name: 'Ver el detalle de Empresa Ficticia' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver el detalle de Ana Prueba' })).not.toBeInTheDocument();
  });

  it('abre el detalle con vehículos y últimos servicios', async () => {
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver el detalle de Ana Prueba' }));

    const panel = screen.getByRole('dialog', { name: 'Detalle del cliente' });
    expect(within(panel).getByText('Marca Prueba · Automóvil')).toBeInTheDocument();
    expect(await within(panel).findByText('Lavado de prueba')).toBeInTheDocument();
    expect(within(panel).getByText('$ 22.000')).toBeInTheDocument();
  });

  it('registra un cliente con los datos del formulario', async () => {
    crearCliente.mockResolvedValue({ ...CLIENTES[0], id: 3, nombre: 'Cliente Nuevo' });
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Nuevo cliente' }));
    const dialogo = screen.getByRole('dialog', { name: 'Nuevo cliente' });
    await userEvent.type(within(dialogo).getByLabelText(/Nombre/), 'Cliente Nuevo');
    await userEvent.type(within(dialogo).getByLabelText(/Documento/), '1000000003');
    await userEvent.type(within(dialogo).getByLabelText(/Teléfono/), '3000000003');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    expect(crearCliente).toHaveBeenCalledWith({
      nombre: 'Cliente Nuevo',
      documento: '1000000003',
      tipo: 'particular',
      telefono: '3000000003',
      creditoHabilitado: false,
      estado: 'activo',
    });
    expect(await screen.findByRole('button', { name: 'Ver el detalle de Cliente Nuevo' })).toBeInTheDocument();
  });

  it('pide confirmación para eliminar y muestra el rechazo de la API', async () => {
    eliminarCliente.mockRejectedValue(new ErrorHttp('No se puede eliminar un cliente con vehículos asociados', { estado: 409 }));
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Ver el detalle de Ana Prueba' }));
    await userEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    const confirmacion = screen.getByRole('dialog', { name: 'Eliminar a Ana Prueba' });
    await userEvent.click(within(confirmacion).getByRole('button', { name: 'Eliminar' }));

    expect(eliminarCliente).toHaveBeenCalledWith(1);
    expect(await within(confirmacion).findByText(/vehículos asociados/)).toBeInTheDocument();
  });

  it('soporte consulta, pero no ve las acciones de gestión', async () => {
    renderizar('soporte');

    await screen.findByRole('button', { name: 'Ver el detalle de Ana Prueba' });
    expect(screen.queryByRole('button', { name: 'Nuevo cliente' })).not.toBeInTheDocument();
  });
});
