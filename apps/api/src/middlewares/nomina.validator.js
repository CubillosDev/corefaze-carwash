const { body, query } = require('express-validator');

// cxc no se registra a mano: lo crea liquidar_quincena() con el saldo
// pendiente de la quincena anterior (ADR 0006).
const TIPOS_DESCUENTO_MANUAL = ['prestamo', 'jabon', 'multa'];
const TOPE_DESCUENTO = 10000000;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const fecha = (ubicacion, campo) =>
  ubicacion(campo)
    .isISO8601({ strict: true })
    .withMessage(`${campo} debe ser una fecha YYYY-MM-DD`)
    .bail()
    .matches(PATRON_FECHA)
    .withMessage(`${campo} debe ser una fecha YYYY-MM-DD`);

const validarQuincena = [fecha(query, 'fecha').optional()];

const validarDescuento = [
  body('colaboradorId')
    .isInt({ min: 1 })
    .withMessage('colaboradorId debe ser un entero positivo')
    .toInt(),
  body('tipo')
    .isIn(TIPOS_DESCUENTO_MANUAL)
    .withMessage(`tipo debe ser uno de: ${TIPOS_DESCUENTO_MANUAL.join(', ')}`),
  body('valor')
    .isInt({ min: 1, max: TOPE_DESCUENTO })
    .withMessage(`valor debe ser un entero entre 1 y ${TOPE_DESCUENTO}`)
    .toInt(),
  body('observacion')
    .optional({ values: 'null' })
    .isString()
    .withMessage('observacion debe ser texto')
    .bail()
    .trim()
    .isLength({ max: 255 })
    .withMessage('observacion admite hasta 255 caracteres'),
];

const validarLiquidacion = [
  fecha(body, 'inicio'),
  fecha(body, 'fin')
    .bail()
    .custom((fin, { req }) => fin >= req.body.inicio)
    .withMessage('fin no puede ser anterior a inicio'),
];

module.exports = { TIPOS_DESCUENTO_MANUAL, validarQuincena, validarDescuento, validarLiquidacion };
