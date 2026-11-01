const { body } = require('express-validator');
const { LIMITES } = require('../constants/dominio');

const validarNombreNegocio = () =>
  body('nombreNegocio')
    .optional()
    .isString()
    .withMessage('El nombre del negocio debe ser texto')
    .bail()
    .trim()
    .isLength({ min: LIMITES.nombre.min, max: LIMITES.nombre.max })
    .withMessage(
      `El nombre del negocio debe tener entre ${LIMITES.nombre.min} y ${LIMITES.nombre.max} caracteres`,
    );

const validarNit = () =>
  body('nit')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('El nit debe ser texto')
    .bail()
    .trim()
    .isLength({ max: 15 })
    .withMessage('El nit no puede superar los 15 caracteres');

const validarDireccion = () =>
  body('direccion')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('La dirección debe ser texto')
    .bail()
    .trim()
    .isLength({ max: 150 })
    .withMessage('La dirección no puede superar los 150 caracteres');

const validarTelefono = () =>
  body('telefono')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('El teléfono debe ser texto')
    .bail()
    .isLength({ min: LIMITES.telefono.longitud, max: LIMITES.telefono.longitud })
    .withMessage(`El teléfono debe tener exactamente ${LIMITES.telefono.longitud} dígitos`)
    .bail()
    .isNumeric()
    .withMessage('El teléfono debe contener solo dígitos');

const validarPorcentajeComision = () =>
  body('porcentajeComision')
    .optional()
    .isFloat({ min: LIMITES.porcentajeComision.min, max: LIMITES.porcentajeComision.max })
    .withMessage(
      `porcentajeComision debe estar entre ${LIMITES.porcentajeComision.min} y ${LIMITES.porcentajeComision.max}`,
    )
    .toFloat();

const validarComisionVigenteDesde = () =>
  body('comisionVigenteDesde')
    .optional()
    .isISO8601()
    .withMessage('comisionVigenteDesde debe tener un formato de fecha ISO 8601 válido');

const validarDescontarComisionDiaria = () =>
  body('descontarComisionDiaria')
    .optional()
    .isBoolean()
    .withMessage('descontarComisionDiaria debe ser verdadero o falso')
    .toBoolean();

/** Los 7 costos/precios/topes de parametros_negocio comparten la misma regla: entero >= 0. */
const CAMPOS_DINERO = [
  'costoArriendo',
  'costoLuz',
  'costoAgua',
  'costoNominaFija',
  'costoDepreciacion',
  'costoInsumos',
  'costoVariableLavado',
  'precioPromedioReferencia',
  'topePrestamoColaborador',
];

const validarCampoDinero = (campo) =>
  body(campo)
    .optional()
    .isInt({ min: 0 })
    .withMessage(`${campo} debe ser un entero mayor o igual a 0`)
    .toInt();

const validarDiasOperacionMes = () =>
  body('diasOperacionMes')
    .optional()
    .isInt({ min: 1, max: 31 })
    .withMessage('diasOperacionMes debe ser un entero entre 1 y 31')
    .toInt();

/**
 * PATCH /api/parametros: cada campo es opcional, se actualiza lo que se
 * envíe. "id" y "actualizadoPor" no se declaran aquí a propósito: el
 * servidor los controla por completo (id es fijo, actualizadoPor sale
 * del usuario autenticado), así que matchedData/validar los descarta
 * aunque el cliente los envíe.
 */
const validarActualizar = [
  validarNombreNegocio(),
  validarNit(),
  validarDireccion(),
  validarTelefono(),
  validarPorcentajeComision(),
  validarComisionVigenteDesde(),
  validarDescontarComisionDiaria(),
  ...CAMPOS_DINERO.map(validarCampoDinero),
  validarDiasOperacionMes(),
];

module.exports = { validarActualizar };
