import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listarColaboradores } from '@/features/colaboradores/api/colaboradores.api';
import { ProveedorSesion } from '@/features/autenticacion';
import { listarJornadas } from '@/features/jornadas/api/jornadas.api';
import { cambiarEstadoOrden, listarOrdenes } from '@/features/ordenes-lavado/api/ordenesLavado.api';
import { DetalleOrdenPage } from '@/features/ordenes-lavado/pages/DetalleOrdenPage';
import { OrdenesLavadoPage } from '@/features/ordenes-lavado/pages/OrdenesLavadoPage';
import { listarServicios } from '@/features/servicios/api/servicios.api';
import { listarVehiculos } from '@/features/vehiculos/api/vehiculos.api';
import { ErrorHttp } from '@/lib/httpCliente';

vi.mock('@/features/jornadas/api/jornadas.api', () => ({ listarJornadas: vi.fn() }));
vi.mock('@/features/vehiculos/api/vehiculos.api', () => ({ listarVehiculos: vi.fn() }));
vi.mock('@/features/servicios/api/servicios.api', () => ({ listarServicios: vi.fn() }));
vi.mock('@/features/colaboradores/api/colaboradores.api', () => ({ listarColaboradores: vi.fn() }));
vi.mock('@/features/ordenes-lavado/api/ordenesLavado.api', () => ({
  listarOrdenes: vi.fn(),
  listarOrdenesDeVehiculo: vi.fn(),
  crearOrden: vi.fn(),
  cambiarEstadoOrden: vi.fn(),
}));

const JORNADAS = [
  { id: 1, fecha: '2026-08-03', estado: 'cerrada', abiertaEn: '2026-08-03T12:00:00Z', reaperturas: [] },
  { id: 2, fecha: '2026-08-04', estado: 'abierta', abiertaEn: '2026-08-04T12:00:00Z', reaperturas: [] },
];
const ORDEN = {
  id: 10,
  jornadaId: 2,
  fecha: '2026-08-04',
  turno: 4,
  vehiculoId: 1,
  servicioId: 1,
  colaboradorId: 1,
  valor: 22000,
  medioPago: 'efectivo',
  estado: 'registrada',
  creadaEn: '2026-08-04T13:00:00Z',
};

function renderizar({ rol = 'administrador', ruta = '/ordenes-lavado' } = {}) {
  return render(
    <ProveedorSesion sesionInicial={{ usuario: { id: 1, nombre: 'Ana Prueba', email: 'a@prueba.co', rol }, token: 't' }}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/ordenes-lavado" element={<OrdenesLavadoPage />}>
            <Route path=":idOrden" element={<DetalleOrdenPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ProveedorSesion>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  listarJornadas.mockResolvedValue(JORNADAS);
  listarVehiculos.mockResolvedValue([{ id: 1, placa: 'AAA111', marca: 'Marca Prueba', tipoVehiculo: 'automovil' }]);
  listarServicios.mockResolvedValue([{ id: 1, numero: 1, nombre: 'Lavado de prueba', categoria: 'lavado', activo: true }]);
  listarColaboradores.mockResolvedValue([{ id: 1, codigo: 401, nombre: 'Colaborador Prueba', estado: 'activo' }]);
  listarOrdenes.mockResolvedValue({ ordenes: [ORDEN], totales: { cantidadServicios: 1, totalGeneral: 22000 } });
});

describe('OrdenesLavadoPage', () => {
  it('muestra cargando y luego el tablero de la jornada abierta', async () => {
    renderizar();

    expect(screen.getByText('Cargando órdenes…')).toBeInTheDocument();
    const columna = await screen.findByRole('region', { name: 'Registrada' });
    expect(within(columna).getByText('AAA 111')).toBeInTheDocument();
    expect(within(columna).getByText('Lavado de prueba')).toBeInTheDocument();
    expect(listarOrdenes).toHaveBeenCalledWith({ jornadaId: 2 }, expect.any(Object));
  });

  it('ofrece solo las transiciones del contrato y cambia el estado por PATCH', async () => {
    cambiarEstadoOrden.mockResolvedValue({ ...ORDEN, estado: 'en_proceso' });
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar el estado de la orden de AAA 111' }));
    const menu = screen.getByRole('menu', { name: 'Mover a' });
    expect(within(menu).getAllByRole('menuitem').map((opcion) => opcion.textContent)).toEqual([
      'RegistradaActual',
      'En proceso',
      'Cancelada',
    ]);

    await userEvent.click(within(menu).getByRole('menuitem', { name: 'En proceso' }));

    expect(cambiarEstadoOrden).toHaveBeenCalledWith(10, { estado: 'en_proceso', motivo: undefined });
    expect(await screen.findByRole('region', { name: 'En proceso' })).toHaveTextContent('AAA 111');
  });

  it('pide confirmación antes de anular y muestra el mensaje de la API si falla', async () => {
    cambiarEstadoOrden.mockRejectedValue(new ErrorHttp('Una orden entregada o cancelada no puede cambiar de estado', { estado: 409 }));
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar el estado de la orden de AAA 111' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Cancelada' }));

    const dialogo = screen.getByRole('dialog', { name: 'Anular la orden de AAA 111' });
    expect(cambiarEstadoOrden).not.toHaveBeenCalled();

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Anular orden' }));
    expect(await within(dialogo).findByText(/no puede cambiar de estado/)).toBeInTheDocument();
  });

  it('soporte no ve la opción de anular', async () => {
    renderizar({ rol: 'soporte' });

    await userEvent.click(await screen.findByRole('button', { name: 'Cambiar el estado de la orden de AAA 111' }));

    expect(screen.queryByRole('menuitem', { name: 'Cancelada' })).not.toBeInTheDocument();
  });

  it('cambia a la vista de lista con el valor que calculó el servidor', async () => {
    renderizar();
    await screen.findByRole('region', { name: 'Registrada' });

    await userEvent.click(screen.getByRole('button', { name: 'Lista' }));

    const tabla = screen.getByRole('table');
    expect(within(tabla).getByText('$ 22.000')).toBeInTheDocument();
  });

  it('abre el detalle de la orden en el panel lateral', async () => {
    renderizar({ ruta: '/ordenes-lavado/10' });

    const panel = await screen.findByRole('dialog', { name: 'Detalle de la orden' });
    expect(await within(panel).findByText('$ 22.000')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Pasar a en proceso' })).toBeInTheDocument();
  });

  it('si la carga falla, muestra el error y reintenta', async () => {
    listarJornadas.mockRejectedValueOnce(new ErrorHttp('No pudimos comunicarnos con el servidor.'));
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('region', { name: 'Registrada' })).toBeInTheDocument();
  });

  it('sin jornadas muestra el estado vacío con el enlace a jornadas', async () => {
    listarJornadas.mockResolvedValue([]);
    renderizar();

    expect(await screen.findByText('Aún no hay jornadas')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a jornadas' })).toHaveAttribute('href', '/jornadas');
  });
});
