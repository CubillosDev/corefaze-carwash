const { body } = require('express-validator');
const { TIPOS_VEHICULO, PATRONES_PLACA, LIMITES } = require('../constants/dominio');

const normalizarPlaca = (valor) => valor.trim().toUpperCase();

/** Acepta el formato de carro O el de moto; la correspondencia exacta con el tipo se valida en el service. */
const esFormatoDePlacaValido = (placa) =>
  PATRONES_PLACA.CARRO.test(placa) || PATRONES_PLACA.MOTO.test(placa);

const validarPlaca = () =>
  body('placa')
    .isString()
    .withMessage('La placa debe ser texto')
    .bail()
    .customSanitizer(normalizarPlaca)
    .custom(esFormatoDePlacaValido)
    .withMessage('La placa debe tener el formato ABC123 (carro) o ABC12D (moto)');

const validarTipo = () =>
  body('tipo')
    .isIn(Object.values(TIPOS_VEHICULO))
    .withMessage(`El tipo debe ser uno de: ${Object.values(TIPOS_VEHICULO).join(', ')}`);

const validarMarcaOColor = (campo) =>
  body(campo)
    .optional({ values: 'falsy' })
    .isString()
    .withMessage(`${campo} debe ser texto`)
    .bail()
    .trim()
    .isLength({ min: LIMITES.marcaColor.min, max: LIMITES.marcaColor.max })
    .withMessage(
      `${campo} debe tener entre ${LIMITES.marcaColor.min} y ${LIMITES.marcaColor.max} caracteres`,
    );

const validarClienteId = () =>
  body('clienteId').isInt({ min: 1 }).withMessage('clienteId debe ser un entero positivo').toInt();

/** POST /api/vehiculos: placa, tipo y clienteId son obligatorios. */
const validarCrear = [
  validarPlaca(),
  validarTipo(),
  validarMarcaOColor('marca'),
  validarMarcaOColor('color'),
  validarClienteId(),
];

/** PUT /api/vehiculos/:id: cada campo es opcional. */
const validarActualizar = [
  validarPlaca().optional(),
  validarTipo().optional(),
  validarMarcaOColor('marca'),
  validarMarcaOColor('color'),
  validarClienteId().optional(),
];

module.exports = { validarCrear, validarActualizar };
