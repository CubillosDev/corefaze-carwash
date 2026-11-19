import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  actualizarCliente,
  crearCliente,
  eliminarCliente,
  listarClientes,
} from '@/features/clientes/api/clientes.api';
import { httpCliente } from '@/lib/httpCliente';

vi.mock('@/lib/httpCliente', () => ({
  httpCliente: { obtener: vi.fn(), crear: vi.fn(), reemplazar: vi.fn(), eliminar: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('clientes.api', () => {
  it('lista, crea, edita y elimina con la ruta y el método de la API', async () => {
    httpCliente.obtener.mockResolvedValue({ clientes: [{ id: 1 }] });
    httpCliente.crear.mockResolvedValue({ cliente: { id: 2 } });
    httpCliente.reemplazar.mockResolvedValue({ cliente: { id: 2, nombre: 'Otro' } });
    httpCliente.eliminar.mockResolvedValue({ mensaje: 'Cliente eliminado' });

    await expect(listarClientes()).resolves.toEqual([{ id: 1 }]);
    await expect(crearCliente({ nombre: 'Ana' })).resolves.toEqual({ id: 2 });
    await expect(actualizarCliente(2, { nombre: 'Otro' })).resolves.toEqual({ id: 2, nombre: 'Otro' });
    await expect(eliminarCliente(2)).resolves.toBeUndefined();

    expect(httpCliente.crear).toHaveBeenCalledWith('clientes', { nombre: 'Ana' });
    expect(httpCliente.reemplazar).toHaveBeenCalledWith('clientes/2', { nombre: 'Otro' });
    expect(httpCliente.eliminar).toHaveBeenCalledWith('clientes/2');
  });
});
