const { validationResult } = require('express-validator');
const {
  validarFiltroListar,
  validarCambioDeEstado,
} = require('../../../src/middlewares/jornadas.validator');

const ejecutarValidacionesDeQuery = async (validaciones, query) => {
  const req = { query };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

const ejecutarValidacionesDeBody = async (validaciones, body) => {
  const req = { body };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

describe('jornadas.validator', () => {
  describe('validarFiltroListar', () => {
    it('pasa sin filtros', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListar, {});
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa con desde y hasta válidos', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListar, {
        desde: '2026-01-01',
        hasta: '2026-01-31',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un desde con formato inválido', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListar, {
        desde: '01-01-2026',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un hasta con formato inválido', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListar, {
        hasta: 'no-es-fecha',
      });
      expect(resultado.isEmpty()).toBe(false);
    });
  });

  describe('validarCambioDeEstado', () => {
    it('pasa con estado "cerrada"', async () => {
      const resultado = await ejecutarValidacionesDeBody(validarCambioDeEstado, {
        estado: 'cerrada',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa con estado "abierta"', async () => {
      const resultado = await ejecutarValidacionesDeBody(validarCambioDeEstado, {
        estado: 'abierta',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un estado que no existe en el dominio', async () => {
      const resultado = await ejecutarValidacionesDeBody(validarCambioDeEstado, {
        estado: 'pausada',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza cuando falta el campo estado', async () => {
      const resultado = await ejecutarValidacionesDeBody(validarCambioDeEstado, {});
      expect(resultado.isEmpty()).toBe(false);
    });
  });
});
