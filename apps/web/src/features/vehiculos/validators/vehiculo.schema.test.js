import { describe, expect, it } from 'vitest';

import { normalizarPlaca, validarVehiculo } from '@/features/vehiculos/validators/vehiculo.schema';

const CARRO = { placa: 'ABC123', tipoVehiculo: 'automovil', marca: '', color: '', clienteId: '3' };
const MOTO = { placa: 'ABC12D', tipoVehiculo: 'moto_hasta_150cc', marca: '', color: '', clienteId: '3' };

describe('normalizarPlaca', () => {
  it('pasa a mayúsculas y quita espacios, guiones y símbolos', () => {
    expect(normalizarPlaca(' abc-123 ')).toBe('ABC123');
    expect(normalizarPlaca('abc 12d')).toBe('ABC12D');
    expect(normalizarPlaca(null)).toBe('');
  });
});

describe('validarVehiculo', () => {
  it('acepta un carro y una moto válidos', () => {
    expect(validarVehiculo(CARRO).valido).toBe(true);
    expect(validarVehiculo(MOTO).valido).toBe(true);
  });

  it('normaliza la placa y convierte el cliente a número', () => {
    const { datos } = validarVehiculo({ ...CARRO, placa: ' abc-123 ' });

    expect(datos).toEqual({ placa: 'ABC123', tipoVehiculo: 'automovil', clienteId: 3 });
  });

  it('en modo crear no envía marca ni color vacíos', () => {
    const { datos } = validarVehiculo(CARRO, { modo: 'crear' });

    expect(datos).not.toHaveProperty('marca');
    expect(datos).not.toHaveProperty('color');
  });

  it('en modo crear envía marca y color si se escribieron (recortados)', () => {
    const { datos } = validarVehiculo({ ...CARRO, marca: ' Mazda ', color: 'Rojo' });

    expect(datos).toMatchObject({ marca: 'Mazda', color: 'Rojo' });
  });

  it('en modo editar envía marca y color aunque estén vacíos, para poder borrarlos', () => {
    const { datos } = validarVehiculo(CARRO, { modo: 'editar' });

    expect(datos).toMatchObject({ marca: '', color: '' });
  });

  it('exige placa, tipo y cliente', () => {
    const { valido, errores } = validarVehiculo({ placa: '', tipoVehiculo: '', clienteId: '' });

    expect(valido).toBe(false);
    expect(errores.placa).toMatch(/escribe la placa/i);
    expect(errores.tipoVehiculo).toBeDefined();
    expect(errores.clienteId).toBeDefined();
  });

  it('rechaza placas con formato inválido', () => {
    for (const placa of ['AB123', 'ABCD12', '123ABC', 'ABC1234', 'ABC12', 'A1C123']) {
      expect(validarVehiculo({ ...CARRO, placa }).errores.placa, placa).toMatch(/formato/i);
    }
  });

  it('rechaza una placa de moto en un automóvil y una de carro en una moto', () => {
    expect(validarVehiculo({ ...CARRO, placa: 'ABC12D' }).errores.placa).toBe(
      'La placa no corresponde al formato de carro.',
    );
    expect(validarVehiculo({ ...MOTO, placa: 'ABC123' }).errores.placa).toBe(
      'La placa no corresponde al formato de moto.',
    );
  });

  it('acepta placa de moto en cualquiera de los dos tipos de moto', () => {
    expect(validarVehiculo({ ...MOTO, tipoVehiculo: 'moto_desde_150cc' }).valido).toBe(true);
  });

  it('rechaza un tipo que no es del contrato', () => {
    expect(validarVehiculo({ ...CARRO, tipoVehiculo: 'bicicleta' }).errores.tipoVehiculo).toBeDefined();
  });

  it('limita marca y color a 2-30 caracteres cuando se escriben', () => {
    expect(validarVehiculo({ ...CARRO, marca: 'M' }).errores.marca).toMatch(/entre 2 y 30/);
    expect(validarVehiculo({ ...CARRO, color: 'x'.repeat(31) }).errores.color).toMatch(/entre 2 y 30/);
    expect(validarVehiculo({ ...CARRO, marca: 'Kia', color: 'Gris' }).valido).toBe(true);
  });

  it('rechaza un cliente que no es un entero positivo', () => {
    for (const clienteId of ['', '0', '-1', '1.5', 'abc']) {
      expect(validarVehiculo({ ...CARRO, clienteId }).errores.clienteId, clienteId).toBeDefined();
    }
  });
});
