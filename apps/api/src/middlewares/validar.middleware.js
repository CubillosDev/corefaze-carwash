const { validationResult, matchedData, param } = require('express-validator');
const { SolicitudInvalida } = require('../utils/errores');

/**
 * Valida que :id de la URL sea un entero positivo (400 si no lo es).
 * Compartida por todos los recursos (antes estaba duplicada, idéntica,
 * en cada routes.js) para no repetir la misma validación archivo por
 * archivo; se usa como cualquier otro middleware de validación.
 */
const validarIdDeUrl = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

/**
 * Va al final de la cadena de validaciones de cada ruta:
 *   router.post('/', validarCrear, validar, controller.crear)
 *
 * - Si hay errores → 400 con un solo mensaje por campo.
 * - Si no → deja en req.datos SOLO los campos declarados en el validador
 *   (protección contra mass assignment), ya convertidos por los .toInt() y similares.
 */
const validar = (req, _res, next) => {
  const resultado = validationResult(req);

  if (!resultado.isEmpty()) {
    const errores = resultado
      .array({ onlyFirstError: true })
      .map((error) => ({ campo: error.path, mensaje: error.msg }));
    return next(new SolicitudInvalida(errores));
  }

  req.datos = {
    cuerpo: matchedData(req, { locations: ['body'] }),
    parametros: matchedData(req, { locations: ['params'] }),
    consulta: matchedData(req, { locations: ['query'] }),
  };
  return next();
};

module.exports = { validar, validarIdDeUrl };
