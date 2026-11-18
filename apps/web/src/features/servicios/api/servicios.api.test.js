import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  actualizarServicio,
  crearServicio,
  eliminarServicio,
  listarServicios,
} from '@/features/servicios/api/servicios.api';
import { httpCliente } from '@/lib/httpCliente';

vi.mock('@/lib/httpCliente', () => ({
  httpCliente: { obtener: vi.fn(), crear: vi.fn(), reemplazar: vi.fn(), eliminar: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('servicios.api', () => {
  it('lista, crea, edita y elimina con la ruta y el método de la API', async () => {
    httpCliente.obtener.mockResolvedValue({ servicios: [{ id: 1 }] });
    httpCliente.crear.mockResolvedValue({ servicio: { id: 2 } });
    httpCliente.reemplazar.mockResolvedValue({ servicio: { id: 2, activo: false } });
    httpCliente.eliminar.mockResolvedValue({ mensaje: 'Servicio eliminado' });

    await expect(listarServicios()).resolves.toEqual([{ id: 1 }]);
    await expect(crearServicio({ numero: 20 })).resolves.toEqual({ id: 2 });
    await expect(actualizarServicio(2, { activo: false })).resolves.toEqual({ id: 2, activo: false });
    await expect(eliminarServicio(2)).resolves.toBeUndefined();

    expect(httpCliente.crear).toHaveBeenCalledWith('servicios', { numero: 20 });
    expect(httpCliente.reemplazar).toHaveBeenCalledWith('servicios/2', { activo: false });
    expect(httpCliente.eliminar).toHaveBeenCalledWith('servicios/2');
  });
});
