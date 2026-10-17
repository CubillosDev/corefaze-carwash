const { validationResult } = require('express-validator');
const { validarFiltroListar } = require('../../../src/middlewares/jornadas.validator');

const ejecutarValidaciones = async (validaciones, query) => {
  const req = { query };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  return validationResult(req);
};

describe('jornadas.validator', () => {
  describe('validarFiltroListar', () => {
    it('pasa sin filtros', async () => {
      const resultado = await ejecutarValidaciones(validarFiltroListar, {});
      expect(resultado.isEmpty()).toBe(true);
    });

    it('pasa con desde y hasta válidos', async () => {
      const resultado = await ejecutarValidaciones(validarFiltroListar, {
        desde: '2026-01-01',
        hasta: '2026-01-31',
      });
      expect(resultado.isEmpty()).toBe(true);
    });

    it('rechaza un desde con formato inválido', async () => {
      const resultado = await ejecutarValidaciones(validarFiltroListar, { desde: '01-01-2026' });
      expect(resultado.isEmpty()).toBe(false);
    });

    it('rechaza un hasta con formato inválido', async () => {
      const resultado = await ejecutarValidaciones(validarFiltroListar, { hasta: 'no-es-fecha' });
      expect(resultado.isEmpty()).toBe(false);
    });
  });
});
