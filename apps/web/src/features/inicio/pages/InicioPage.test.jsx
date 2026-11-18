import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProveedorSesion } from '@/features/autenticacion';
import { InicioPage } from '@/features/inicio/pages/InicioPage';
import { abrirJornada, cambiarEstadoJornada, listarJornadas } from '@/features/jornadas/api/jornadas.api';
import { listarOrdenes } from '@/features/ordenes-lavado/api/ordenesLavado.api';

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

const ABIERTA = { id: 2, fecha: '2026-08-04', estado: 'abierta', abiertaEn: '2026-08-04T12:00:00Z', unidades: 3 };

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
});

describe('InicioPage', () => {
  it('muestra los totales que calcula el servidor y las órdenes por fase', async () => {
    listarJornadas.mockResolvedValue([ABIERTA]);
    listarOrdenes.mockResolvedValue({
      ordenes: [{ id: 1, estado: 'registrada' }, { id: 2, estado: 'en_proceso' }, { id: 3, estado: 'terminada' }],
      totales: { cantidadServicios: 3, totalGeneral: 80000, totalesPorMedioPago: {} },
    });
    renderizar();

    expect(await screen.findByRole('heading', { name: 'Buen día, Ana' })).toBeInTheDocument();
    expect(await screen.findAllByText('$ 80.000')).toHaveLength(2);
    expect(listarOrdenes).toHaveBeenCalledWith({ jornadaId: 2 }, expect.any(Object));

    const patio = screen.getByRole('region', { name: 'Patio en vivo' });
    expect(within(patio).getByText('Registrada').closest('li')).toHaveTextContent('1');
    expect(screen.getByText('1 vehículo listo para entregar')).toBeInTheDocument();
    expect(screen.getByText('Disponible próximamente')).toBeInTheDocument();
  });

  it('sin jornada abierta lo avisa y permite abrirla', async () => {
    listarJornadas.mockResolvedValue([]);
    abrirJornada.mockResolvedValue(ABIERTA);
    renderizar();

    expect(await screen.findByText('No hay jornada abierta')).toBeInTheDocument();
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
