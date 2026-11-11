import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  actualizarVehiculo,
  crearVehiculo,
  eliminarVehiculo,
  listarVehiculos,
} from '@/features/vehiculos/api/vehiculos.api';
import { httpCliente } from '@/lib/httpCliente';

// httpCliente está congelado (Object.freeze), así que no se puede espiar.
vi.mock('@/lib/httpCliente', () => ({
  httpCliente: { obtener: vi.fn(), crear: vi.fn(), reemplazar: vi.fn(), eliminar: vi.fn() },
}));

const VEHICULO = { id: 1, placa: 'ABC123', tipoVehiculo: 'automovil', marca: null, color: null, clienteId: 2 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('vehiculos.api', () => {
  it('listarVehiculos pide GET vehiculos y devuelve el arreglo', async () => {
    httpCliente.obtener.mockResolvedValue({ vehiculos: [VEHICULO] });
    const signal = new AbortController().signal;

    await expect(listarVehiculos({ signal })).resolves.toEqual([VEHICULO]);
    expect(httpCliente.obtener).toHaveBeenCalledWith('vehiculos', { signal });
  });

  it('crearVehiculo envía POST vehiculos y devuelve el vehículo creado', async () => {
    httpCliente.crear.mockResolvedValue({ mensaje: 'ok', vehiculo: VEHICULO });
    const datos = { placa: 'ABC123', tipoVehiculo: 'automovil', clienteId: 2 };

    await expect(crearVehiculo(datos)).resolves.toEqual(VEHICULO);
    expect(httpCliente.crear).toHaveBeenCalledWith('vehiculos', datos);
  });

  it('actualizarVehiculo envía PUT vehiculos/:id y devuelve el vehículo', async () => {
    httpCliente.reemplazar.mockResolvedValue({ mensaje: 'ok', vehiculo: VEHICULO });

    await expect(actualizarVehiculo(1, { color: 'Rojo' })).resolves.toEqual(VEHICULO);
    expect(httpCliente.reemplazar).toHaveBeenCalledWith('vehiculos/1', { color: 'Rojo' });
  });

  it('eliminarVehiculo envía DELETE vehiculos/:id', async () => {
    httpCliente.eliminar.mockResolvedValue({ mensaje: 'ok' });

    await expect(eliminarVehiculo(1)).resolves.toBeUndefined();
    expect(httpCliente.eliminar).toHaveBeenCalledWith('vehiculos/1');
  });

  it('deja pasar el error de la API (por ejemplo, el 409 de placa repetida)', async () => {
    const error = Object.assign(new Error('Ya existe un vehículo con esa placa'), { estado: 409 });
    httpCliente.crear.mockRejectedValue(error);

    await expect(crearVehiculo({})).rejects.toBe(error);
  });
});
