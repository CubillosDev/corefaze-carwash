const { body, query } = require('express-validator');
const { MEDIOS_PAGO } = require('../constants/dominio');

const CATEGORIAS_EGRESO = ['insumos', 'almuerzos', 'servicios_publicos', 'otros'];
const TOPE_BASE = 10000000;
const TOPE_EGRESO = 10000000;
const TOPE_EFECTIVO = 100000000;
const PATRON_VALE = /^[A-Za-z0-9-]{3,30}$/;

const validarFiltroEstado = [
  query('jornadaId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('jornadaId debe ser un entero positivo')
    .toInt(),
];

const validarApertura = [
  body('baseInicial')
    .isInt({ min: 0, max: TOPE_BASE })
    .withMessage(`baseInicial debe ser un entero entre 0 y ${TOPE_BASE}`)
    .toInt(),
];

const validarEgreso = [
  body('categoria')
    .isIn(CATEGORIAS_EGRESO)
    .withMessage(`categoria debe ser una de: ${CATEGORIAS_EGRESO.join(', ')}`),
  body('concepto')
    .optional({ values: 'null' })
    .isString()
    .withMessage('concepto debe ser texto')
    .bail()
    .trim()
    .isLength({ max: 255 })
    .withMessage('concepto admite hasta 255 caracteres'),
  body('valor')
    .isInt({ min: 1, max: TOPE_EGRESO })
    .withMessage(`valor debe ser un entero entre 1 y ${TOPE_EGRESO}`)
    .toInt(),
];

/**
 * El valor nunca llega del cliente (R4): se cobra el de la orden. A crédito
 * exige empresa y vale; en efectivo admite lo recibido; nada más los lleva.
 */
const validarCobro = [
  body('ordenId').isInt({ min: 1 }).withMessage('ordenId debe ser un entero positivo').toInt(),
  body('medioPago')
    .isIn(Object.values(MEDIOS_PAGO))
    .withMessage(`medioPago debe ser uno de: ${Object.values(MEDIOS_PAGO).join(', ')}`),
  body('recibido')
    .optional({ values: 'null' })
    .isInt({ min: 0, max: TOPE_EFECTIVO })
    .withMessage(`recibido debe ser un entero entre 0 y ${TOPE_EFECTIVO}`)
    .bail()
    .custom((_valor, { req }) => req.body.medioPago === MEDIOS_PAGO.EFECTIVO)
    .withMessage('Solo un cobro en efectivo registra el valor recibido')
    .toInt(),
  body('clienteId')
    .if((_valor, { req }) => req.body.medioPago === MEDIOS_PAGO.CREDITO)
    .isInt({ min: 1 })
    .withMessage('Un cobro a crédito exige la empresa (clienteId)')
    .toInt(),
  body('numeroVale')
    .if((_valor, { req }) => req.body.medioPago === MEDIOS_PAGO.CREDITO)
    .isString()
    .withMessage('Un cobro a crédito exige el número de vale')
    .bail()
    .trim()
    .matches(PATRON_VALE)
    .withMessage('El número de vale tiene de 3 a 30 letras, números o guiones')
    .customSanitizer((valor) => valor.toUpperCase()),
  body(['clienteId', 'numeroVale'])
    .if((_valor, { req }) => req.body.medioPago !== MEDIOS_PAGO.CREDITO)
    .custom((valor) => valor === undefined || valor === null)
    .withMessage('Solo un cobro a crédito lleva empresa y vale'),
];

const validarCierre = [
  body('efectivoContado')
    .isInt({ min: 0, max: TOPE_EFECTIVO })
    .withMessage(`efectivoContado debe ser un entero entre 0 y ${TOPE_EFECTIVO}`)
    .toInt(),
];

module.exports = {
  CATEGORIAS_EGRESO,
  validarFiltroEstado,
  validarApertura,
  validarEgreso,
  validarCobro,
  validarCierre,
};
