const { body } = require('express-validator');
const { ESTADOS_ACTIVIDAD } = require('../constants/dominio');

const TOPE_STOCK = 1000000;
const TOPE_MOVIMIENTO = 100000;

const texto = (campo, minimo, maximo) =>
  body(campo)
    .isString()
    .withMessage(`${campo} es obligatorio`)
    .bail()
    .trim()
    .isLength({ min: minimo, max: maximo })
    .withMessage(`${campo} debe tener entre ${minimo} y ${maximo} caracteres`);

const datosDelInsumo = [
  texto('nombre', 3, 100),
  texto('categoria', 2, 50),
  texto('unidad', 1, 30),
  body('stockMinimo')
    .isInt({ min: 0, max: TOPE_STOCK })
    .withMessage(`stockMinimo debe ser un entero entre 0 y ${TOPE_STOCK}`)
    .toInt(),
];

const validarCrear = [
  ...datosDelInsumo,
  body('stockInicial')
    .optional()
    .isInt({ min: 0, max: TOPE_STOCK })
    .withMessage(`stockInicial debe ser un entero entre 0 y ${TOPE_STOCK}`)
    .toInt(),
];

const validarActualizar = datosDelInsumo;

const validarEstado = [
  body('estado')
    .isIn(Object.values(ESTADOS_ACTIVIDAD))
    .withMessage(`estado debe ser uno de: ${Object.values(ESTADOS_ACTIVIDAD).join(', ')}`),
];

const validarMovimiento = [
  body('cantidad')
    .isInt({ min: -TOPE_MOVIMIENTO, max: TOPE_MOVIMIENTO })
    .withMessage(`cantidad debe ser un entero entre -${TOPE_MOVIMIENTO} y ${TOPE_MOVIMIENTO}`)
    .bail()
    .custom((cantidad) => Number(cantidad) !== 0)
    .withMessage('cantidad no puede ser cero')
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

module.exports = { validarCrear, validarActualizar, validarEstado, validarMovimiento };
