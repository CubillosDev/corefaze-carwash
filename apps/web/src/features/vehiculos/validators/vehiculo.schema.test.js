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

  it('no envía marca ni color vacíos', () => {
    for (const opciones of [undefined, { anterior: { marca: null, color: '' } }]) {
      const { datos, valido } = validarVehiculo(CARRO, opciones);

      expect(valido).toBe(true);
      expect(datos).not.toHaveProperty('marca');
      expect(datos).not.toHaveProperty('color');
    }
  });

  it('envía marca y color si se escribieron (recortados)', () => {
    const { datos } = validarVehiculo({ ...CARRO, marca: ' Mazda ', color: 'Rojo' });

    expect(datos).toMatchObject({ marca: 'Mazda', color: 'Rojo' });
  });

  it('al editar, no deja vaciar una marca o un color que el vehículo ya tenía', () => {
    const anterior = { marca: 'Mazda', color: 'Rojo' };

    const { valido, errores } = validarVehiculo({ ...CARRO, marca: '  ', color: '' }, { anterior });

    expect(valido).toBe(false);
    expect(errores.marca).toBe('La marca no se puede borrar. Escribe la correcta.');
    expect(errores.color).toBe('El color no se puede borrar. Escribe el correcto.');
  });

  it('al editar, sí deja cambiar la marca y el color por otros', () => {
    const anterior = { marca: 'Mazda', color: 'Rojo' };

    const { valido, datos } = validarVehiculo({ ...CARRO, marca: 'Kia', color: 'Azul' }, { anterior });

    expect(valido).toBe(true);
    expect(datos).toMatchObject({ marca: 'Kia', color: 'Azul' });
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
