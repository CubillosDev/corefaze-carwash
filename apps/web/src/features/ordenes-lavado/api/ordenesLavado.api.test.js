import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listarOrdenesDeVehiculo } from '@/features/ordenes-lavado/api/ordenesLavado.api';
import { httpCliente } from '@/lib/httpCliente';

vi.mock('@/lib/httpCliente', () => ({ httpCliente: { obtener: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listarOrdenesDeVehiculo', () => {
  it('devuelve solo las órdenes del vehículo pedido', async () => {
    httpCliente.obtener.mockResolvedValue({
      ordenes: [
        { id: 1, vehiculoId: 5 },
        { id: 2, vehiculoId: 6 },
        { id: 3, vehiculoId: 5 },
      ],
      totales: {},
    });
    const signal = new AbortController().signal;

    const ordenes = await listarOrdenesDeVehiculo('5', { signal });

    expect(httpCliente.obtener).toHaveBeenCalledWith('ordenes-lavado', { signal });
    expect(ordenes.map((orden) => orden.id)).toEqual([1, 3]);
  });

  it('devuelve un arreglo vacío si el vehículo no tiene órdenes', async () => {
    httpCliente.obtener.mockResolvedValue({ ordenes: [{ id: 1, vehiculoId: 9 }] });

    await expect(listarOrdenesDeVehiculo(5)).resolves.toEqual([]);
  });
});
