const { validationResult } = require('express-validator');
const { validarCrear, validarActualizar } = require('../../../src/middlewares/clientes.validator');

const ejecutarValidaciones = async (validaciones, cuerpo) => {
  const req = { body: cuerpo };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

const clienteValido = {
  nombre: 'Ana María Torres',
  documento: '1010101010',
  tipo: 'particular',
  telefono: '3001234567',
};

describe('clientes.validator', () => {
  describe('validarCrear', () => {
    it('pasa con datos válidos', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, clienteValido);
      expect(resultado.isEmpty()).toBe(true);
    });

    it('acepta tipo empresa con creditoHabilitado', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...clienteValido,
        tipo: 'empresa',
        creditoHabilitado: true,
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('acepta un cliente sin email', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, clienteValido);
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un nombre demasiado corto', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...clienteValido,
        nombre: 'Al',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un documento demasiado corto', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...clienteValido,
        documento: '123',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un tipo que no existe en el dominio', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, { ...clienteValido, tipo: 'vip' });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('tipo');
    });

    it('rechaza un teléfono con menos de 10 dígitos', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...clienteValido,
        telefono: '123',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un teléfono con letras', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...clienteValido,
        telefono: '30012345ab',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un email con formato inválido', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...clienteValido,
        email: 'no-es-un-correo',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza campos obligatorios ausentes', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {});
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().length).toBeGreaterThan(0);
    });

    it('ignora el campo estado si se envía en la creación (no está en el contrato)', async () => {
      const resultado = await ejecutarValidaciones(validarCrear, {
        ...clienteValido,
        estado: 'inactivo',
      });
      expect(resultado.isEmpty()).toBe(true);
    });
  });

  describe('validarActualizar', () => {
    it('pasa sin enviar ningún campo (actualización vacía es válida en el validador)', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, {});
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa enviando solo el teléfono', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { telefono: '3009999999' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un teléfono inválido aunque sea el único campo enviado', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { telefono: '123' });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('acepta actualizar el estado a inactivo', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { estado: 'inactivo' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un estado que no existe en el dominio', async () => {
      const resultado = await ejecutarValidaciones(validarActualizar, { estado: 'suspendido' });
      expect(resultado.isEmpty()).toBe(false);
    });
  });
});
