import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  actualizarColaborador,
  cambiarEstadoColaborador,
  crearColaborador,
  listarColaboradores,
} from '@/features/colaboradores/api/colaboradores.api';
import { httpCliente } from '@/lib/httpCliente';

vi.mock('@/lib/httpCliente', () => ({
  httpCliente: { obtener: vi.fn(), crear: vi.fn(), reemplazar: vi.fn(), actualizar: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('colaboradores.api', () => {
  it('lista, crea, edita y cambia el estado con la ruta y el método de la API', async () => {
    httpCliente.obtener.mockResolvedValue({ colaboradores: [{ id: 1 }] });
    httpCliente.crear.mockResolvedValue({ colaborador: { id: 2 } });
    httpCliente.reemplazar.mockResolvedValue({ colaborador: { id: 2, nombre: 'Nuevo' } });
    httpCliente.actualizar.mockResolvedValue({ colaborador: { id: 2, estado: 'inactivo' } });

    await expect(listarColaboradores()).resolves.toEqual([{ id: 1 }]);
    await expect(crearColaborador({ nombre: 'Ana' })).resolves.toEqual({ id: 2 });
    await expect(actualizarColaborador(2, { nombre: 'Nuevo' })).resolves.toEqual({ id: 2, nombre: 'Nuevo' });
    await expect(cambiarEstadoColaborador(2, 'inactivo')).resolves.toEqual({ id: 2, estado: 'inactivo' });

    expect(httpCliente.obtener).toHaveBeenCalledWith('colaboradores', { signal: undefined });
    expect(httpCliente.crear).toHaveBeenCalledWith('colaboradores', { nombre: 'Ana' });
    expect(httpCliente.reemplazar).toHaveBeenCalledWith('colaboradores/2', { nombre: 'Nuevo' });
    expect(httpCliente.actualizar).toHaveBeenCalledWith('colaboradores/2/estado', { estado: 'inactivo' });
  });
});
