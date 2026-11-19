import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cambiarEstadoOrden,
  crearOrden,
  listarOrdenes,
  listarOrdenesDeVehiculo,
} from '@/features/ordenes-lavado/api/ordenesLavado.api';
import { httpCliente } from '@/lib/httpCliente';

vi.mock('@/lib/httpCliente', () => ({
  httpCliente: { obtener: vi.fn(), crear: vi.fn(), actualizar: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listarOrdenes', () => {
  it('envía los filtros como consulta y devuelve órdenes y totales del servidor', async () => {
    const totales = { cantidadServicios: 1, totalGeneral: 22000, totalesPorMedioPago: {} };
    httpCliente.obtener.mockResolvedValue({ ordenes: [{ id: 1 }], totales });
    const signal = new AbortController().signal;

    const resultado = await listarOrdenes({ jornadaId: 2 }, { signal });

    expect(httpCliente.obtener).toHaveBeenCalledWith('ordenes-lavado', {
      consulta: { jornadaId: 2 },
      signal,
    });
    expect(resultado).toEqual({ ordenes: [{ id: 1 }], totales });
  });
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

describe('crearOrden', () => {
  it('envía los datos tal cual y devuelve la orden creada', async () => {
    const datos = { turno: 1, vehiculoId: 2, servicioId: 3, colaboradorId: 4, medioPago: 'efectivo' };
    httpCliente.crear.mockResolvedValue({ mensaje: 'Orden creada', orden: { id: 9, valor: 22000 } });

    await expect(crearOrden(datos)).resolves.toEqual({ id: 9, valor: 22000 });
    expect(httpCliente.crear).toHaveBeenCalledWith('ordenes-lavado', datos);
  });
});

describe('cambiarEstadoOrden', () => {
  it('usa PATCH /estado y solo envía el motivo si hay uno', async () => {
    httpCliente.actualizar.mockResolvedValue({ orden: { id: 1, estado: 'en_proceso' } });

    await cambiarEstadoOrden(1, { estado: 'en_proceso' });
    await cambiarEstadoOrden(1, { estado: 'cancelada', motivo: 'El cliente se fue' });

    expect(httpCliente.actualizar.mock.calls).toEqual([
      ['ordenes-lavado/1/estado', { estado: 'en_proceso' }],
      ['ordenes-lavado/1/estado', { estado: 'cancelada', motivo: 'El cliente se fue' }],
    ]);
  });
});
