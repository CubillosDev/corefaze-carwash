const { validationResult } = require('express-validator');
const {
  validarCrear,
  validarActualizar,
  validarCambioDeEstado,
} = require('../../../src/middlewares/colaboradores.validator');

const ejecutarValidaciones = async (validaciones, cuerpo) => {
  const req = { body: cuerpo };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

const colaboradorValido = {
  codigo: 401,
  nombre: 'Juan Pérez',
  documento: '1020304050',
  telefono: '3001234567',
  porcentajeComision: 0.15,
  tipoVinculacion: 'fijo',
};

describe('colaboradores.validator', () => {
  describe('validarCrear', () => {
    it('pasa con datos válidos', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, colaboradorValido);
      expect(resultado.isEmpty()).toBe(true);
    });

    it('acepta tipoVinculacion ocasional', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        tipoVinculacion: 'ocasional',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('acepta los límites inclusive de porcentajeComision (0 y 1)', async () => {
      const resultadoMin = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        porcentajeComision: 0,
      });
      expect(resultadoMin.isEmpty()).toBe(true);

      const resultadoMax = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        porcentajeComision: 1,
      });
      expect(resultadoMax.isEmpty()).toBe(true);
    });

    it('acepta los límites inclusive del código (100 y 999)', async () => {
      const resultadoMin = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        codigo: 100,
      });
      expect(resultadoMin.isEmpty()).toBe(true);

      const resultadoMax = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        codigo: 999,
      });
      expect(resultadoMax.isEmpty()).toBe(true);
    });

    it('rechaza campos obligatorios ausentes', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {});
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().length).toBeGreaterThan(0);
    });

    it('rechaza un código con menos de 3 dígitos', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        codigo: 99,
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('codigo');
    });

    it('rechaza un código con más de 3 dígitos', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        codigo: 1000,
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('codigo');
    });

    it('rechaza un nombre demasiado corto', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        nombre: 'Al',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un documento demasiado corto', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        documento: '123',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un teléfono con menos de 10 dígitos', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        telefono: '123',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un teléfono con letras', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        telefono: '30012345ab',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un porcentajeComision por debajo de 0', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        porcentajeComision: -0.01,
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('porcentajeComision');
    });

    it('rechaza un porcentajeComision por encima de 1', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        porcentajeComision: 1.01,
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('porcentajeComision');
    });

    it('rechaza un tipoVinculacion que no existe en el dominio', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        tipoVinculacion: 'indefinido',
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('tipoVinculacion');
    });

    it('ignora el campo estado si se envía en la creación (no está en el contrato)', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        estado: 'inactivo',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('ignora un estado inválido en la creación (no está en el contrato)', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...colaboradorValido,
        estado: 'suspendido',
      });
      expect(resultado.isEmpty()).toBe(true);
    });
  });

  describe('validarActualizar', () => {
    it('pasa sin enviar ningún campo (actualización vacía es válida en el validador)', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, {});
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo el código', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { codigo: 402 });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo el nombre', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { nombre: 'María Gómez' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo el documento', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { documento: '1122334455' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo el teléfono', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { telefono: '3009999999' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo el porcentajeComision', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { porcentajeComision: 0.2 });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo el tipoVinculacion', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, {
        tipoVinculacion: 'ocasional',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo el estado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { estado: 'inactivo' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un código inválido aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { codigo: 7 });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un nombre inválido aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { nombre: 'Al' });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un documento inválido aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { documento: '123' });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un teléfono inválido aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { telefono: '123' });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un porcentajeComision inválido aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { porcentajeComision: 1.5 });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un tipoVinculacion inválido aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, {
        tipoVinculacion: 'temporal',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un estado que no existe en el dominio', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { estado: 'suspendido' });
      expect(resultado.isEmpty()).toBe(false);
    });
  });

  describe('validarCambioDeEstado', () => {
    it('pasa con un estado real del dominio', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, { estado: 'inactivo' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un estado que no existe en el dominio', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, { estado: 'suspendido' });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza cuando falta el campo estado', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, {});
      expect(resultado.isEmpty()).toBe(false);
    });
  });
});
