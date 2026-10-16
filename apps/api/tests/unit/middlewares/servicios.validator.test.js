const { validationResult } = require('express-validator');
const { validarCrear, validarActualizar } = require('../../../src/middlewares/servicios.validator');

const ejecutarValidaciones = async (validaciones, cuerpo) => {
  const req = { body: cuerpo };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

const servicioValido = {
  numero: 1,
  nombre: 'Lavado básico',
  descripcion: 'Lavado exterior con shampoo',
  categoria: 'basico',
  tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
};

describe('servicios.validator', () => {
  describe('validarCrear', () => {
    it('pasa con datos válidos y una sola tarifa', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, servicioValido);
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa con varias tarifas de distintos tipos de vehículo', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...servicioValido,
        tarifas: [
          { tipoVehiculo: 'automovil', valor: 15000 },
          { tipoVehiculo: 'camioneta', valor: 20000 },
          { tipoVehiculo: 'moto_hasta_150cc', valor: 8000 },
        ],
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa sin descripción ni categoría (ambas opcionales)', async () => {
      const sinOpcionales = { ...servicioValido };
      delete sinOpcionales.descripcion;
      delete sinOpcionales.categoria;

      const resultado = await ejecutarValidaciones(validarCrear, sinOpcionales);
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza campos obligatorios ausentes', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {});
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().length).toBeGreaterThan(0);
    });

    it('rechaza un número no positivo', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...servicioValido,
        numero: 0,
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('numero');
    });

    it('rechaza un nombre demasiado corto', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...servicioValido,
        nombre: 'Al',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza una descripción que excede el máximo', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...servicioValido,
        descripcion: 'a'.repeat(256),
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza una categoría fuera de rango', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...servicioValido,
        categoria: 'Al',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un arreglo de tarifas vacío', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...servicioValido,
        tarifas: [],
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('tarifas');
    });

    it('rechaza una tarifa con tipoVehiculo que no existe en el dominio', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...servicioValido,
        tarifas: [{ tipoVehiculo: 'barco', valor: 15000 }],
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'tarifas[0].tipoVehiculo')).toBe(
        true,
      );
    });

    it('rechaza una tarifa con valor por debajo del mínimo', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...servicioValido,
        tarifas: [{ tipoVehiculo: 'automovil', valor: 999 }],
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza una tarifa con valor por encima del máximo', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...servicioValido,
        tarifas: [{ tipoVehiculo: 'automovil', valor: 1000001 }],
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    // Defensa en profundidad: esta misma regla también la aplica
    // tieneTipoVehiculoDuplicado en servicios.service.js, pero el validador
    // debe rechazarla primero con un 400 antes de llegar al service.
    it('rechaza tarifas con dos entradas del mismo tipoVehiculo', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...servicioValido,
        tarifas: [
          { tipoVehiculo: 'automovil', valor: 15000 },
          { tipoVehiculo: 'automovil', valor: 18000 },
        ],
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('tarifas');
      expect(resultado.array()[0].msg).toBe(
        'No puede haber dos tarifas para el mismo tipo de vehículo',
      );
    });

    it('ignora el campo activo si se envía en la creación (no está en el contrato)', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...servicioValido,
        activo: false,
      });
      expect(resultado.isEmpty()).toBe(true);
    });
  });

  describe('validarActualizar', () => {
    it('pasa sin enviar ningún campo (actualización vacía es válida en el validador)', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, {});
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo el número', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { numero: 2 });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo el nombre', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, {
        nombre: 'Lavado premium',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo la descripción', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, {
        descripcion: 'Incluye encerado',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo la categoría', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { categoria: 'premium' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo las tarifas', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, {
        tarifas: [{ tipoVehiculo: 'camioneta', valor: 22000 }],
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo el estado activo', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { activo: false });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un número inválido aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { numero: -1 });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un nombre inválido aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { nombre: 'Al' });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza una descripción inválida aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, {
        descripcion: 'a'.repeat(256),
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza una categoría inválida aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { categoria: 'Al' });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un arreglo de tarifas vacío al actualizar', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { tarifas: [] });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza tarifas con dos entradas del mismo tipoVehiculo al actualizar', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, {
        tarifas: [
          { tipoVehiculo: 'moto_hasta_150cc', valor: 8000 },
          { tipoVehiculo: 'moto_hasta_150cc', valor: 9000 },
        ],
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].msg).toBe(
        'No puede haber dos tarifas para el mismo tipo de vehículo',
      );
    });

    it('rechaza un activo que no es booleano', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { activo: 'si' });
      expect(resultado.isEmpty()).toBe(false);
    });
  });
});
