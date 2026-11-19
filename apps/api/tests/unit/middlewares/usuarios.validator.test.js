const { validationResult } = require('express-validator');
const {
  validarListar,
  validarCambioDeEstado,
} = require('../../../src/middlewares/usuarios.validator');

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

describe('usuarios.validator', () => {
  describe('validarListar', () => {
    it('pasa sin ningún filtro (todos son opcionales)', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarListar, {});
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa con un rol real del dominio', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarListar, { rol: 'pendiente' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un rol que no existe en el dominio', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarListar, { rol: 'medico' });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('rol');
    });

    it('pasa con activo=true o activo=false', async () => {
      const resultadoTrue = await ejecutarValidacionesDeQuery(validarListar, { activo: 'true' });
      expect(resultadoTrue.isEmpty()).toBe(true);

      const resultadoFalse = await ejecutarValidacionesDeQuery(validarListar, { activo: 'false' });
      expect(resultadoFalse.isEmpty()).toBe(true);
    });

    it('rechaza un activo que no es booleano', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarListar, { activo: 'quizas' });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('activo');
    });

    it('pasa con una búsqueda de texto', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarListar, { busqueda: 'Juan' });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza una búsqueda vacía (string vacío tras recortar espacios)', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarListar, { busqueda: '   ' });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('busqueda');
    });

    it('pasa con pagina y porPagina válidos', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarListar, {
        pagina: '2',
        porPagina: '50',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza pagina menor a 1', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarListar, { pagina: '0' });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('pagina');
    });

    it('rechaza porPagina por encima del máximo (100)', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarListar, { porPagina: '101' });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('porPagina');
    });

    it('rechaza porPagina igual a 0', async () => {
      const resultado = await ejecutarValidacionesDeQuery(validarListar, { porPagina: '0' });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('porPagina');
    });
  });

  describe('validarCambioDeEstado', () => {
    it('pasa con activo true', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, { activo: true });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa con activo false', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, { activo: false });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza cuando falta el campo activo', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, {});
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un activo que no es booleano', async () => {
      const resultado = await ejecutarValidaciones(validarCambioDeEstado, { activo: 'si' });
      expect(resultado.isEmpty()).toBe(false);
      expect(resultado.array()[0].path).toBe('activo');
    });
  });
});
