const { body } = require('express-validator');
const { TIPOS_CLIENTE, ESTADOS_ACTIVIDAD, LIMITES } = require('../constants/dominio');

const validarNombre = () =>
  body('nombre')
    .isString()
    .withMessage('El nombre debe ser texto')
    .bail()
    .trim()
    .isLength({ min: LIMITES.nombre.min, max: LIMITES.nombre.max })
    .withMessage(
      `El nombre debe tener entre ${LIMITES.nombre.min} y ${LIMITES.nombre.max} caracteres`,
    );

const validarDocumento = () =>
  body('documento')
    .isString()
    .withMessage('El documento debe ser texto')
    .bail()
    .trim()
    .isLength({ min: LIMITES.documento.min, max: LIMITES.documento.max })
    .withMessage(
      `El documento debe tener entre ${LIMITES.documento.min} y ${LIMITES.documento.max} caracteres`,
    );

const validarTipo = () =>
  body('tipo')
    .isIn(Object.values(TIPOS_CLIENTE))
    .withMessage(`El tipo debe ser uno de: ${Object.values(TIPOS_CLIENTE).join(', ')}`);

const validarTelefono = () =>
  body('telefono')
    .isString()
    .withMessage('El teléfono debe ser texto')
    .bail()
    .isLength({ min: LIMITES.telefono.longitud, max: LIMITES.telefono.longitud })
    .withMessage(`El teléfono debe tener exactamente ${LIMITES.telefono.longitud} dígitos`)
    .bail()
    .isNumeric()
    .withMessage('El teléfono debe contener solo dígitos');

const validarEmail = () =>
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Debe proporcionar un correo electrónico válido')
    .normalizeEmail();

const validarCreditoHabilitado = () =>
  body('creditoHabilitado')
    .optional()
    .isBoolean()
    .withMessage('creditoHabilitado debe ser verdadero o falso')
    .toBoolean();

const validarEstado = () =>
  body('estado')
    .optional()
    .isIn(Object.values(ESTADOS_ACTIVIDAD))
    .withMessage(`El estado debe ser uno de: ${Object.values(ESTADOS_ACTIVIDAD).join(', ')}`);

/** POST /api/clientes: todos los campos obligatorios son requeridos. */
const validarCrear = [
  validarNombre(),
  validarDocumento(),
  validarTipo(),
  validarTelefono(),
  validarEmail(),
  validarCreditoHabilitado(),
];

/** PUT /api/clientes/:id: cada campo es opcional, se actualiza lo que se envíe. */
const validarActualizar = [
  validarNombre().optional(),
  validarDocumento().optional(),
  validarTipo().optional(),
  validarTelefono().optional(),
  validarEmail(),
  validarCreditoHabilitado(),
  validarEstado(),
];

module.exports = { validarCrear, validarActualizar };
