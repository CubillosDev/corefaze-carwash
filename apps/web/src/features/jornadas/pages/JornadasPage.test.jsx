import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProveedorSesion } from '@/features/autenticacion';
import { abrirJornada, cambiarEstadoJornada, listarJornadas } from '@/features/jornadas/api/jornadas.api';
import { JornadasPage } from '@/features/jornadas/pages/JornadasPage';
import { ErrorHttp } from '@/lib/httpCliente';

vi.mock('@/features/jornadas/api/jornadas.api', () => ({
  listarJornadas: vi.fn(),
  abrirJornada: vi.fn(),
  cambiarEstadoJornada: vi.fn(),
}));

const CERRADA = {
  id: 1,
  fecha: '2026-08-03',
  estado: 'cerrada',
  abiertaEn: '2026-08-03T12:00:00Z',
  cerradaEn: '2026-08-04T00:00:00Z',
  reaperturas: [],
  unidades: 11,
  ventaTotal: 496000,
};

function renderizar(rol = 'administrador') {
  render(
    <ProveedorSesion sesionInicial={{ usuario: { id: 1, nombre: 'Ana', email: 'a@prueba.co', rol }, token: 't' }}>
      <JornadasPage />
    </ProveedorSesion>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('JornadasPage', () => {
  it('lista las jornadas con los totales del servidor', async () => {
    listarJornadas.mockResolvedValue([CERRADA]);
    renderizar();

    const fila = (await screen.findAllByRole('row'))[1];
    expect(within(fila).getByText('03/08/2026')).toBeInTheDocument();
    expect(within(fila).getByText('Cerrada')).toBeInTheDocument();
    expect(within(fila).getByText('$ 496.000')).toBeInTheDocument();
  });

  it('una jornada reabierta no muestra hora de cierre', async () => {
    listarJornadas.mockResolvedValue([
      { ...CERRADA, id: 2, estado: 'abierta', reaperturas: [{ en: '2026-08-03T20:00:00Z' }] },
    ]);
    renderizar();

    const fila = (await screen.findAllByRole('row'))[1];
    expect(within(fila).getByText('Abierta')).toBeInTheDocument();
    expect(within(fila).getByText('—')).toBeInTheDocument();
  });

  it('abre la jornada y muestra el mensaje de la API si la rechaza', async () => {
    listarJornadas.mockResolvedValue([CERRADA]);
    abrirJornada.mockRejectedValue(new ErrorHttp('Ya existe una jornada registrada para hoy', { estado: 409 }));
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Abrir jornada' }));

    expect(await screen.findByText('Ya existe una jornada registrada para hoy')).toBeInTheDocument();
  });

  it('solo superadmin ve la opción de reabrir', async () => {
    listarJornadas.mockResolvedValue([CERRADA]);
    cambiarEstadoJornada.mockResolvedValue({ ...CERRADA, estado: 'abierta' });
    renderizar('superadmin');

    await userEvent.click(await screen.findByRole('button', { name: 'Reabrir' }));

    expect(cambiarEstadoJornada).toHaveBeenCalledWith(1, 'abierta');
  });

  it('administrador no ve reabrir', async () => {
    listarJornadas.mockResolvedValue([CERRADA]);
    renderizar('administrador');

    await screen.findAllByRole('row');
    expect(screen.queryByRole('button', { name: 'Reabrir' })).not.toBeInTheDocument();
  });
});
