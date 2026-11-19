import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generarQrJornada, listarJornadas } from '@/features/jornadas/api/jornadas.api';
import { PanelJornada } from '@/features/jornadas/components/PanelJornada';

vi.mock('@/features/jornadas/api/jornadas.api', () => ({ generarQrJornada: vi.fn(), listarJornadas: vi.fn() }));

const codigoNuevo = () => ({
  contenido: `corefaze-jornada:prueba-${generarQrJornada.mock.calls.length}`,
  expiraEn: new Date(Date.now() + 30000).toISOString(),
  vigenciaSegundos: 30,
});

function renderizar(propiedades = {}) {
  const funciones = { alAbrir: vi.fn(), alCerrar: vi.fn(), alAbrirseDesdeElCelular: vi.fn() };
  render(<PanelJornada jornada={null} nombre="Ana Prueba" puedeGestionar enviando={false} {...funciones} {...propiedades} />);
  return funciones;
}

const avanzar = (milisegundos) => act(() => vi.advanceTimersByTimeAsync(milisegundos));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  generarQrJornada.mockImplementation(async () => codigoNuevo());
  listarJornadas.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PanelJornada cerrada', () => {
  it('muestra el QR con su cuenta regresiva y lo renueva al vencer', async () => {
    renderizar();
    await avanzar(0);

    expect(screen.getByRole('img', { name: /Código QR/ })).toBeInTheDocument();
    expect(screen.getByText('Código nuevo en 30 s')).toBeInTheDocument();
    expect(screen.getByText('Apunta la cámara a este código')).toBeInTheDocument();

    await avanzar(10000);
    expect(screen.getByText('Código nuevo en 20 s')).toBeInTheDocument();

    await avanzar(20000);
    expect(generarQrJornada).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Código nuevo en 30 s')).toBeInTheDocument();
  });

  it('avisa cuando el celular abre la jornada', async () => {
    const { alAbrirseDesdeElCelular } = renderizar();
    await avanzar(0);
    listarJornadas.mockResolvedValue([{ id: 9, estado: 'abierta' }]);

    await avanzar(4000);

    expect(listarJornadas).toHaveBeenCalledWith({ desde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    expect(alAbrirseDesdeElCelular).toHaveBeenCalled();
  });

  it('permite abrirla desde el panel', async () => {
    const { alAbrir } = renderizar();
    await avanzar(0);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir desde aquí' }));

    expect(alAbrir).toHaveBeenCalledOnce();
  });

  it('si no se pudo generar el código, ofrece otro', async () => {
    generarQrJornada.mockRejectedValueOnce(new Error('Sin conexión'));
    renderizar();
    await avanzar(0);

    expect(screen.getByRole('alert')).toHaveTextContent('Sin conexión');
    fireEvent.click(screen.getByRole('button', { name: 'Generar otro código' }));
    await avanzar(0);

    expect(generarQrJornada).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('img', { name: /Código QR/ })).toBeInTheDocument();
  });

  it('sin permiso para abrirla no pide código', async () => {
    renderizar({ puedeGestionar: false });
    await avanzar(5000);

    expect(generarQrJornada).not.toHaveBeenCalled();
    expect(screen.getByText(/Pide a soporte o a un administrador/)).toBeInTheDocument();
  });
});

describe('PanelJornada abierta', () => {
  it('no muestra el QR y deja cerrarla', async () => {
    const { alCerrar } = renderizar({ jornada: { id: 2, fecha: '2026-08-04', estado: 'abierta', abiertaEn: '2026-08-04T12:00:00Z', unidades: 3 } });
    await avanzar(5000);

    expect(generarQrJornada).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar jornada' }));
    expect(alCerrar).toHaveBeenCalledOnce();
  });
});
