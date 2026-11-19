import { beforeEach, describe, expect, it, vi } from 'vitest';

import { abrirJornada, cambiarEstadoJornada, listarJornadas } from '@/features/jornadas/api/jornadas.api';
import { httpCliente } from '@/lib/httpCliente';

vi.mock('@/lib/httpCliente', () => ({
  httpCliente: { obtener: vi.fn(), crear: vi.fn(), actualizar: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('jornadas.api', () => {
  it('lista las jornadas con el rango de fechas como consulta', async () => {
    httpCliente.obtener.mockResolvedValue({ jornadas: [{ id: 1 }] });

    await expect(listarJornadas({ desde: '2026-08-01' })).resolves.toEqual([{ id: 1 }]);
    expect(httpCliente.obtener).toHaveBeenCalledWith('jornadas', {
      consulta: { desde: '2026-08-01' },
      signal: undefined,
    });
  });

  it('abre la jornada sin cuerpo', async () => {
    httpCliente.crear.mockResolvedValue({ jornada: { id: 3, estado: 'abierta' } });

    await expect(abrirJornada()).resolves.toEqual({ id: 3, estado: 'abierta' });
    expect(httpCliente.crear).toHaveBeenCalledWith('jornadas', undefined);
  });

  it('cambia el estado con PATCH /estado', async () => {
    httpCliente.actualizar.mockResolvedValue({ jornada: { id: 3, estado: 'cerrada' } });

    await cambiarEstadoJornada(3, 'cerrada');

    expect(httpCliente.actualizar).toHaveBeenCalledWith('jornadas/3/estado', { estado: 'cerrada' });
  });
});
