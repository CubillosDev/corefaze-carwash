import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { listarColaboradores } from '@/features/colaboradores/api/colaboradores.api';
import {
  liquidarQuincena,
  obtenerLiquidacion,
  obtenerResumenQuincena,
  registrarDescuento,
} from '@/features/nomina/api/nomina.api';
import { NominaPage } from '@/features/nomina/pages/NominaPage';

vi.mock('@/features/nomina/api/nomina.api', () => ({
  obtenerResumenQuincena: vi.fn(),
  obtenerLiquidacion: vi.fn(),
  registrarDescuento: vi.fn(),
  liquidarQuincena: vi.fn(),
}));
vi.mock('@/features/colaboradores/api/colaboradores.api', () => ({ listarColaboradores: vi.fn() }));

const FILA = {
  colaboradorId: 3,
  codigo: 405,
  nombre: 'Colaborador Prueba',
  servicios: 9,
  producido: 200000,
  comision: 80000,
  descuentos: { prestamo: 20000, jabon: 5000, multa: 0, cxc: 0 },
  descuentosTotal: 25000,
  neto: 55000,
  saldoPendiente: 0,
};

const quincena = (cambios = {}) => ({
  inicio: '2026-11-16',
  fin: '2026-11-30',
  liquidada: false,
  liquidacionId: null,
  puedeLiquidar: false,
  totales: { servicios: 9, producido: 200000, comision: 80000, descuentos: 25000, neto: 55000, saldoPendiente: 0 },
  colaboradores: [FILA],
  descuentosDelPeriodo: [{ id: 1, colaboradorId: 3, tipo: 'prestamo', valor: 20000, fecha: '2026-11-17', observacion: 'Adelanto' }],
  ...cambios,
});

function renderizar() {
  render(
    <MemoryRouter>
      <NominaPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-19T15:00:00Z'));
  listarColaboradores.mockResolvedValue([{ id: 3, codigo: 405, nombre: 'Colaborador Prueba', estado: 'activo' }]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('NominaPage', () => {
  it('muestra la quincena con las cifras del servidor y el detalle de un colaborador', async () => {
    const usuario = userEvent.setup();
    obtenerResumenQuincena.mockResolvedValue(quincena());
    renderizar();

    expect(await screen.findByText('En curso')).toBeInTheDocument();
    expect(screen.getAllByText('$ 55.000').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Liquidar quincena' })).toBeDisabled();
    expect(obtenerResumenQuincena).toHaveBeenCalledWith({ inicio: '2026-11-16', fin: '2026-11-30' }, expect.anything());

    await usuario.click(screen.getByRole('button', { name: /Colaborador Prueba/ }));
    expect(screen.getByText('Liquidación de la quincena')).toBeInTheDocument();
    expect(screen.getByText('Adelanto')).toBeInTheDocument();
  });

  it('pide la quincena anterior con sus límites exactos', async () => {
    const usuario = userEvent.setup();
    obtenerResumenQuincena.mockResolvedValue(quincena());
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Anterior' }));

    expect(obtenerResumenQuincena).toHaveBeenLastCalledWith({ inicio: '2026-11-01', fin: '2026-11-15' }, expect.anything());
  });

  it('registra un descuento con su tipo', async () => {
    const usuario = userEvent.setup();
    obtenerResumenQuincena.mockResolvedValue(quincena());
    registrarDescuento.mockResolvedValue({ id: 2 });
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Registrar descuento' }));
    const dialogo = screen.getByRole('dialog');
    await usuario.selectOptions(within(dialogo).getByLabelText(/^Colaborador/), '3');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Jabón' }));
    await usuario.type(within(dialogo).getByLabelText(/^Valor/), '5000');
    await usuario.click(within(dialogo).getByRole('button', { name: 'Registrar' }));

    expect(registrarDescuento).toHaveBeenCalledWith({
      colaboradorId: 3,
      tipo: 'jabon',
      valor: 5000,
      fecha: '2026-11-19',
      observacion: null,
    });
  });

  it('liquida una quincena terminada después de confirmar', async () => {
    const usuario = userEvent.setup();
    obtenerResumenQuincena.mockResolvedValue(quincena({ puedeLiquidar: true }));
    liquidarQuincena.mockResolvedValue({ id: 9 });
    renderizar();

    await usuario.click(await screen.findByRole('button', { name: 'Liquidar quincena' }));
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Liquidar' }));

    expect(liquidarQuincena).toHaveBeenCalledWith({ inicio: '2026-11-16', fin: '2026-11-30' });
  });

  it('una quincena liquidada se ve como pagada y sin acciones', async () => {
    obtenerResumenQuincena.mockResolvedValue(quincena({ liquidada: true, liquidacionId: 9 }));
    obtenerLiquidacion.mockResolvedValue({ id: 9, liquidadoEn: '2026-12-01T04:00:00Z' });
    renderizar();

    expect(await screen.findByText('Pagada')).toBeInTheDocument();
    expect(screen.getByText(/liquidada el 30.11.2026/)).toBeInTheDocument();
    expect(obtenerLiquidacion).toHaveBeenCalledWith(9, expect.anything());
    expect(screen.queryByRole('button', { name: 'Liquidar quincena' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar descuento' })).not.toBeInTheDocument();
  });
});
