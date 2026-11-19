import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { obtenerResumen } from '@/features/reportes/api/reportes.api';
import { ReportesPage } from '@/features/reportes/pages/ReportesPage';

vi.mock('@/features/reportes/api/reportes.api', () => ({ obtenerResumen: vi.fn(), obtenerIngresosPorHora: vi.fn() }));

const REPORTE = {
  periodo: { desde: '2026-11-13', hasta: '2026-11-19', dias: 7 },
  totales: { ingresos: 1200000, servicios: 40, ticketPromedio: 30000 },
  anterior: { desde: '2026-11-06', hasta: '2026-11-12', ingresos: 1000000, servicios: 40, ticketPromedio: 24000 },
  porDia: [
    { fecha: '2026-11-18', servicios: 30, ingresos: 900000 },
    { fecha: '2026-11-19', servicios: 10, ingresos: 300000 },
  ],
  servicios: [{ servicioId: 1, nombre: 'Lavado simple', servicios: 40, ingresos: 1200000 }],
  colaboradores: [{ colaboradorId: 3, codigo: 405, nombre: 'Colaborador Prueba', servicios: 40, ingresos: 1200000 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  obtenerResumen.mockResolvedValue(REPORTE);
});

describe('ReportesPage', () => {
  it('muestra los indicadores del servidor con su variación frente al periodo anterior', async () => {
    render(<ReportesPage />);

    expect(await screen.findByText('+20 % frente al periodo anterior')).toBeInTheDocument();
    expect(screen.getByText('0 % frente al periodo anterior')).toBeInTheDocument();
    expect(screen.getByText('+25 % frente al periodo anterior')).toBeInTheDocument();
    expect(screen.getAllByText('$ 1.200.000').length).toBeGreaterThan(0);
    expect(screen.getByText('18/11/2026: $ 900.000')).toBeInTheDocument();
    expect(screen.getByText('100 %')).toBeInTheDocument();
    expect(screen.getByText('Colaborador Prueba')).toBeInTheDocument();
  });

  it('pide la semana por defecto y el mes al cambiar el periodo', async () => {
    const usuario = userEvent.setup();
    render(<ReportesPage />);
    await screen.findByText('Ingresos', { selector: 'h2' });

    const semana = obtenerResumen.mock.calls[0][0];
    expect(semana.desde < semana.hasta).toBe(true);

    await usuario.click(screen.getByRole('button', { name: 'Mes' }));
    const mes = obtenerResumen.mock.calls.at(-1)[0];
    expect(mes.desde.endsWith('-01')).toBe(true);
  });

  it('ofrece reintentar si el reporte falla', async () => {
    obtenerResumen.mockRejectedValueOnce(new Error('Sin conexión'));
    render(<ReportesPage />);
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
  });
});
