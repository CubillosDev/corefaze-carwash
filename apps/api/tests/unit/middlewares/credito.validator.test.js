const { validationResult } = require('express-validator');
const {
  validarRegistrarPago,
  validarFiltroListarPagos,
} = require('../../../src/middlewares/credito.validator');

const ejecutarValidaciones = async (validaciones, cuerpo) => {
  const req = { body: cuerpo };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

const ejecutarValidacionesDeQuery = async (validaciones, query) => {
  const req = { query };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

describe('credito.validator', () => {
  describe('validarRegistrarPago', () => {
    it('pasa con clienteId, un arreglo de ordenIds y medio válidos', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarPago, {
        clienteId: 1,
        ordenIds: [10, 11],
        medio: 'transferencia',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it.each(['transferencia', 'cheque', 'efectivo'])('acepta medio=%s', async (medio) => {
      const resultado = await ejecutarValidaciones(validarRegistrarPago, {
        clienteId: 1,
        ordenIds: [10],
        medio,
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza sin clienteId', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarPago, {
        ordenIds: [10],
        medio: 'transferencia',
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'clienteId')).toBe(true);
    });

    it('rechaza un clienteId que no es un entero positivo', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarPago, {
        clienteId: 0,
        ordenIds: [10],
        medio: 'transferencia',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un ordenIds vacío', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarPago, {
        clienteId: 1,
        ordenIds: [],
        medio: 'transferencia',
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'ordenIds')).toBe(true);
    });

    it('rechaza cuando falta ordenIds', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarPago, {
        clienteId: 1,
        medio: 'transferencia',
      });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza ordenIds con ids repetidos', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarPago, {
        clienteId: 1,
        ordenIds: [10, 10],
        medio: 'transferencia',
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'ordenIds')).toBe(true);
    });

    it('rechaza un elemento de ordenIds que no es un entero positivo', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarPago, {
        clienteId: 1,
        ordenIds: [10, 0],
        medio: 'transferencia',
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'ordenIds[1]')).toBe(true);
    });

    it('rechaza cuando falta medio', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarPago, {
        clienteId: 1,
        ordenIds: [10],
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'medio')).toBe(true);
    });

    it('rechaza un medio que no es transferencia, cheque ni efectivo', async () => {
      const resultado = await ejecutarValidaciones(validarRegistrarPago, {
        clienteId: 1,
        ordenIds: [10],
        medio: 'nequi',
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'medio')).toBe(true);
    });
  });

  describe('validarFiltroListarPagos', () => {
    it('pasa sin ningún filtro (es opcional)', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListarPagos, {});
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa con un clienteId válido', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListarPagos, {
        clienteId: '1',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un clienteId que no es un entero positivo', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListarPagos, {
        clienteId: '0',
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('clienteId');
    });

    it('pasa con pagina y porPagina válidos', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListarPagos, {
        pagina: '2',
        porPagina: '50',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza una pagina menor a 1', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListarPagos, {
        pagina: '0',
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'pagina')).toBe(true);
    });

    it('rechaza un porPagina mayor al máximo (100)', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarFiltroListarPagos, {
        porPagina: '101',
      });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array().some((error) => error.path === 'porPagina')).toBe(true);
    });
  });
});
