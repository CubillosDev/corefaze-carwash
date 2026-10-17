const { body, param } = require('express-validator');
const { validar } = require('../../../src/middlewares/validar.middleware');
const { SolicitudInvalida } = require('../../../src/utils/errores');

// Ejecuta las validaciones sobre una petición falsa y luego el middleware `validar`
const validarPeticion = async (validaciones, peticion) => {
  const req = { body: {}, params: {}, query: {}, ...peticion };
  for (const validacion of validaciones) {
    await validacion.run(req);
  }
  const next = jest.fn();
  validar(req, {}, next);
  return { req, next };
};

const validacionesDeEjemplo = [
  body('nombre')
    .isString()
    .withMessage('nombre debe ser texto')
    .bail()
    .trim()
    .isLength({ min: 3 })
    .withMessage('nombre debe tener al menos 3 caracteres'),
  param('id').optional().isInt({ min: 1 }).withMessage('id debe ser un entero positivo').toInt(),
];

describe('validar', () => {
  describe('con datos válidos', () => {
    it('continúa sin error', async () => {
      const { next } = await validarPeticion(validacionesDeEjemplo, { body: { nombre: 'Ana' } });

      expect(next).toHaveBeenCalledWith();
    });

    it('deja en req.datos solo los campos declarados (mass assignment)', async () => {
      const { req } = await validarPeticion(validacionesDeEjemplo, {
        body: { nombre: 'Ana', valor: 1000, estado: 'entregada', id: 999 },
      });

      expect(req.datos.cuerpo).toEqual({ nombre: 'Ana' });
    });

    it('entrega los valores ya sanitizados y convertidos', async () => {
      const { req } = await validarPeticion(validacionesDeEjemplo, {
        body: { nombre: '  Ana  ' },
        params: { id: '5' },
      });

      expect(req.datos.cuerpo.nombre).toBe('Ana');
      expect(req.datos.parametros.id).toBe(5);
    });
  });

  describe('con datos inválidos', () => {
    it('pasa una SolicitudInvalida con el detalle por campo', async () => {
      const { next } = await validarPeticion(validacionesDeEjemplo, { body: { nombre: 'A' } });

      const [error] = next.mock.calls[0];
      expect(error).toBeInstanceOf(SolicitudInvalida);
      expect(error.errores).toEqual([
        { campo: 'nombre', mensaje: 'nombre debe tener al menos 3 caracteres' },
      ]);
    });

    it('reporta un solo error por campo aunque falle más de una regla', async () => {
      const { next } = await validarPeticion(validacionesDeEjemplo, { body: { nombre: 123 } });

      const [error] = next.mock.calls[0];
      expect(error.errores).toHaveLength(1);
    });

    it('reporta el campo obligatorio faltante', async () => {
      const { next } = await validarPeticion(validacionesDeEjemplo, { body: {} });

      const [error] = next.mock.calls[0];
      expect(error.errores[0].campo).toBe('nombre');
    });

    it('rechaza un id de la URL que no es entero positivo', async () => {
      const { next } = await validarPeticion(validacionesDeEjemplo, {
        body: { nombre: 'Ana' },
        params: { id: 'abc' },
      });

      const [error] = next.mock.calls[0];
      expect(error.errores).toEqual([{ campo: 'id', mensaje: 'id debe ser un entero positivo' }]);
    });

    it('reúne los errores de varios campos', async () => {
      const { next } = await validarPeticion(validacionesDeEjemplo, {
        body: { nombre: 'A' },
        params: { id: '-3' },
      });

      const [error] = next.mock.calls[0];
      expect(error.errores.map((e) => e.campo)).toEqual(['nombre', 'id']);
    });
  });
});
