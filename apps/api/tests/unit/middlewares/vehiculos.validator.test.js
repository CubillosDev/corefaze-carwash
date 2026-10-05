const { validationResult } = require('express-validator');
const { validarCrear, validarActualizar } = require('../../../src/middlewares/vehiculos.validator');

const ejecutarValidaciones = async (validaciones, cuerpo) => {
  const req = { body: cuerpo };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

const vehiculoValido = { placa: 'ABC123', tipo: 'automovil', clienteId: 1 };

describe('vehiculos.validator', () => {
  describe('validarCrear', () => {
    it('pasa con datos válidos', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, vehiculoValido);
      expect(resultado.isEmpty()).toBe(true);
    });

    it('acepta el formato de placa de moto', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...vehiculoValido,
        placa: 'ABC12D',
        tipo: 'moto_hasta_150cc',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza una placa con formato inválido (12-ABC)', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...vehiculoValido,
        placa: '12-ABC',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un tipo que no existe en el dominio', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...vehiculoValido,
        tipo: 'barco',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un clienteId que no es un entero positivo', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...vehiculoValido,
        clienteId: -1,
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza una marca demasiado corta', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, { ...vehiculoValido, marca: 'A' });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('acepta un vehículo sin marca ni color', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, vehiculoValido);
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza campos obligatorios ausentes', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {});
      expect(resultado.isEmpty()).toBe(false);
    });
  });

  describe('validarActualizar', () => {
    it('pasa sin enviar ningún campo', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, {});
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo el color', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { color: 'rojo' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza una placa inválida aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { placa: '123ABC' });
      expect(resultado.isEmpty()).toBe(false);
    });
  });
});
