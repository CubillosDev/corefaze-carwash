const { validationResult } = require('express-validator');
const {
  validarColaboradorIdDeUrl,
  validarResumenQuincena,
  validarDescuentosDeColaborador,
  validarRegistrarDescuento,
  validarLiquidarQuincena,
  validarFiltroListarLiquidaciones,
} = require('../../../src/middlewares/nomina.validator');

const ejecutarValidaciones = async (validaciones, { body = {}, params = {}, query = {} } = {}) => {
  const req = { body, params, query };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

describe('nomina.validator', () => {
  describe('validarColaboradorIdDeUrl', () => {
    it('pasa con un colaboradorId entero positivo', async () => {
      const resultado = await ejecutarValidaciones(validarColaboradorIdDeUrl, {
        params: { colaboradorId: '1' },
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un colaboradorId que no es un entero positivo', async () => {
      const resultado = await ejecutarValidaciones(validarColaboradorIdDeUrl, {
        params: { colaboradorId: '0' },
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('colaboradorId');
    });
  });

  describe('validarResumenQuincena', () => {
    it('pasa con inicio y fin en formato ISO', async () => {
      const resultado = await ejecutarValidaciones(validarResumenQuincena, {
        query: { inicio: '2026-01-01', fin: '2026-01-15' },
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza si falta inicio', async () => {
      const resultado = await ejecutarValidaciones(validarResumenQuincena, {
        query: { fin: '2026-01-15' },
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'inicio')).toBe(true);
    });

    it('rechaza una fecha con formato inválido', async () => {
      const resultado = await ejecutarValidaciones(validarResumenQuincena, {
        query: { inicio: '01/01/2026', fin: '2026-01-15' },
      });
      expect(resultado.isEmpty()).toBe(false);
    });
  });

  describe('validarDescuentosDeColaborador', () => {
    it('pasa con colaboradorId, inicio y fin válidos', async () => {
      const resultado = await ejecutarValidaciones(validarDescuentosDeColaborador, {
        params: { colaboradorId: '1' },
        query: { inicio: '2026-01-01', fin: '2026-01-15' },
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza sin fin', async () => {
      const resultado = await ejecutarValidaciones(validarDescuentosDeColaborador, {
        params: { colaboradorId: '1' },
        query: { inicio: '2026-01-01' },
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'fin')).toBe(true);
    });
  });

  describe('validarRegistrarDescuento', () => {
    const datosValidos = { colaboradorId: 1, tipo: 'jabon', valor: 1000, fecha: '2026-01-01' };

    it('pasa con todos los campos obligatorios', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarDescuento, {
        body: datosValidos,
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa con observacion opcional', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarDescuento, {
        body: { ...datosValidos, observacion: 'Préstamo urgente' },
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un tipo que no está en el CHECK (prestamo|jabon|multa|cxc)', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarDescuento, {
        body: { ...datosValidos, tipo: 'cafe' },
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'tipo')).toBe(true);
    });

    it('rechaza un valor menor o igual a cero', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarDescuento, {
        body: { ...datosValidos, valor: 0 },
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'valor')).toBe(true);
    });

    it('rechaza una fecha con formato inválido', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarDescuento, {
        body: { ...datosValidos, fecha: '01-01-2026' },
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza una observacion mayor a 255 caracteres', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarDescuento, {
        body: { ...datosValidos, observacion: 'a'.repeat(256) },
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'observacion')).toBe(true);
    });
  });

  describe('validarLiquidarQuincena', () => {
    it('pasa con inicio y fin válidos', async () => {
      const resultado = await ejecutarValidaciones(validarLiquidarQuincena, {
        body: { inicio: '2026-01-01', fin: '2026-01-15' },
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza sin inicio ni fin', async () => {
      const resultado = await ejecutarValidaciones(validarLiquidarQuincena, { body: {} });
      expect(resultado.isEmpty()).toBe(false);
    });
  });

  describe('validarFiltroListarLiquidaciones', () => {
    it('pasa sin ningún filtro (es opcional)', async () => {
      const resultado = await ejecutarValidaciones(validarFiltroListarLiquidaciones, {});
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza una pagina menor a 1', async () => {
      const resultado = await ejecutarValidaciones(validarFiltroListarLiquidaciones, {
        query: { pagina: '0' },
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un porPagina mayor al máximo (100)', async () => {
      const resultado = await ejecutarValidaciones(validarFiltroListarLiquidaciones, {
        query: { porPagina: '101' },
      });
      expect(resultado.isEmpty()).toBe(false);
    });
  });
});
