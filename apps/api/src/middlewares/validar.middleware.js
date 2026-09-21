const { validationResult, matchedData } = require('express-validator');
const { SolicitudInvalida } = require('../utils/errores');

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

module.exports = { validar };
