import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProveedorSesion } from '@/features/autenticacion';
import { obtenerEstadoCaja } from '@/features/caja/api/caja.api';
import { InicioPage } from '@/features/inicio/pages/InicioPage';
import { listarInsumos } from '@/features/inventario/api/inventario.api';
import { abrirJornada, cambiarEstadoJornada, listarJornadas } from '@/features/jornadas/api/jornadas.api';
import { listarOrdenes } from '@/features/ordenes-lavado/api/ordenesLavado.api';
import { obtenerIngresosPorHora } from '@/features/reportes/api/reportes.api';

vi.mock('@/features/jornadas/api/jornadas.api', () => ({
  listarJornadas: vi.fn(),
  abrirJornada: vi.fn(),
  cambiarEstadoJornada: vi.fn(),
}));
vi.mock('@/features/ordenes-lavado/api/ordenesLavado.api', () => ({
  listarOrdenes: vi.fn(),
  listarOrdenesDeVehiculo: vi.fn(),
  crearOrden: vi.fn(),
  cambiarEstadoOrden: vi.fn(),
}));
vi.mock('@/features/caja/api/caja.api', () => ({ obtenerEstadoCaja: vi.fn() }));
vi.mock('@/features/reportes/api/reportes.api', () => ({ obtenerIngresosPorHora: vi.fn(), obtenerResumen: vi.fn() }));
vi.mock('@/features/inventario/api/inventario.api', () => ({ listarInsumos: vi.fn() }));

const ABIERTA = { id: 2, fecha: '2026-08-04', estado: 'abierta', abiertaEn: '2026-08-04T12:00:00Z', unidades: 3 };

const CURVA = {
  fecha: '2026-08-04',
  horas: [
    { hora: 9, servicios: 1, ingresos: 30000 },
    { hora: 10, servicios: 2, ingresos: 50000 },
  ],
  total: 80000,
  anterior: { fecha: '2026-08-03', horas: [{ hora: 9, servicios: 1, ingresos: 40000 }], total: 40000 },
};

const hace = (minutos) => new Date(Date.now() - minutos * 60000).toISOString();

const CAJA = {
  totales: { porCobrar: 25000, vehiculosPorCobrar: 1 },
  enPatio: [{ id: 7, estado: 'en_proceso', creadoEn: hace(45), vehiculo: { placa: 'ABC123' } }],
  porCobrar: [],
};

const INSUMOS = [
  { id: 1, nombre: 'Shampoo', unidad: 'galones', stock: 1, stockMinimo: 3, stockBajo: true, estado: 'activo' },
  { id: 2, nombre: 'Cera', unidad: 'kg', stock: 9, stockMinimo: 2, stockBajo: false, estado: 'activo' },
];

function renderizar(rol = 'administrador') {
  render(
    <ProveedorSesion sesionInicial={{ usuario: { id: 1, nombre: 'Ana Prueba', email: 'a@prueba.co', rol }, token: 't' }}>
      <MemoryRouter>
        <InicioPage />
      </MemoryRouter>
    </ProveedorSesion>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  obtenerEstadoCaja.mockResolvedValue(CAJA);
  obtenerIngresosPorHora.mockResolvedValue(CURVA);
  listarInsumos.mockResolvedValue(INSUMOS);
});

describe('InicioPage', () => {
  it('muestra los totales del servidor, la curva frente a la jornada anterior y el patio', async () => {
    listarJornadas.mockResolvedValue([ABIERTA]);
    listarOrdenes.mockResolvedValue({
      ordenes: [{ id: 1, estado: 'registrada' }, { id: 2, estado: 'en_proceso' }, { id: 3, estado: 'terminada' }],
      totales: { cantidadServicios: 3, totalGeneral: 80000, totalesPorMedioPago: {} },
    });
    renderizar();

    expect(await screen.findByRole('heading', { name: 'Buen día, Ana' })).toBeInTheDocument();
    expect(await screen.findAllByText('$ 80.000')).toHaveLength(2);
    expect(listarOrdenes).toHaveBeenCalledWith({ jornadaId: 2 }, expect.any(Object));
    expect(obtenerIngresosPorHora).toHaveBeenCalledWith('2026-08-04', expect.any(Object));

    expect(screen.getByText('+100 % vs. ayer')).toBeInTheDocument();
    expect(screen.getByText('$ 40.000').parentElement).toHaveTextContent('Ayer a esta hora: $ 40.000');
    expect(screen.getByRole('img', { name: /Ingresos acumulados: \$ 80\.000 hasta ahora/ })).toBeInTheDocument();
    expect(screen.getByText('$ 25.000')).toBeInTheDocument();

    const patio = screen.getByRole('region', { name: 'Patio en vivo' });
    expect(within(patio).getByText('Registrada').closest('li')).toHaveTextContent('1');
  });

  it('avisa de vehículos demorados, cobros pendientes e insumos bajos', async () => {
    listarJornadas.mockResolvedValue([ABIERTA]);
    listarOrdenes.mockResolvedValue({ ordenes: [], totales: null });
    renderizar();

    const atencion = await screen.findByRole('region', { name: 'Requiere atención' });
    expect(within(atencion).getByText('ABC 123 demorado')).toBeInTheDocument();
    expect(within(atencion).getByText('45 min en patio · En proceso')).toBeInTheDocument();
    expect(within(atencion).getByText('1 vehículo espera cobro')).toBeInTheDocument();
    expect(within(atencion).getByText('Shampoo bajo')).toBeInTheDocument();
    expect(within(atencion).queryByText('Cera bajo')).not.toBeInTheDocument();
  });

  it('si la caja, la curva o el inventario fallan, el tablero se muestra igual', async () => {
    listarJornadas.mockResolvedValue([ABIERTA]);
    listarOrdenes.mockResolvedValue({ ordenes: [{ id: 3, estado: 'terminada' }], totales: { cantidadServicios: 1, totalGeneral: 20000 } });
    obtenerEstadoCaja.mockRejectedValue(new Error('caída'));
    obtenerIngresosPorHora.mockRejectedValue(new Error('caída'));
    listarInsumos.mockRejectedValue(new Error('caída'));
    renderizar();

    expect(await screen.findByText('No pudimos cargar los ingresos por hora.')).toBeInTheDocument();
    expect(screen.getByText('1 vehículo terminado')).toBeInTheDocument();
  });

  it('sin jornada abierta lo avisa y permite abrirla', async () => {
    listarJornadas.mockResolvedValue([]);
    abrirJornada.mockResolvedValue(ABIERTA);
    renderizar();

    expect(await screen.findByText('No hay jornada abierta')).toBeInTheDocument();
    expect(screen.getByText('Abre la jornada para ver la curva del día.')).toBeInTheDocument();
    expect(listarOrdenes).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Abrir jornada' }));

    expect(abrirJornada).toHaveBeenCalledOnce();
    expect(listarJornadas).toHaveBeenCalledTimes(2);
  });

  it('pide confirmación antes de cerrar la jornada', async () => {
    listarJornadas.mockResolvedValue([ABIERTA]);
    listarOrdenes.mockResolvedValue({ ordenes: [], totales: null });
    cambiarEstadoJornada.mockResolvedValue({ ...ABIERTA, estado: 'cerrada' });
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar jornada' }));
    const dialogo = screen.getByRole('dialog', { name: 'Cerrar la jornada del 04/08/2026' });
    expect(cambiarEstadoJornada).not.toHaveBeenCalled();

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cerrar jornada' }));
    expect(cambiarEstadoJornada).toHaveBeenCalledWith(2, 'cerrada');
  });

  it('si falla la carga, ofrece reintentar', async () => {
    listarJornadas.mockRejectedValueOnce(new Error('No pudimos comunicarnos con el servidor.'));
    listarJornadas.mockResolvedValueOnce([]);
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('No hay jornada abierta')).toBeInTheDocument();
  });
});
