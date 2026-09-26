const { body } = require('express-validator');
const { ROLES } = require('../constants/dominio');

const LONGITUD_MINIMA_PASSWORD = 10;
// bcrypt trunca silenciosamente cualquier entrada más allá de 72 bytes;
// limitar aquí evita que una contraseña más larga se recorte sin avisar.
const LONGITUD_MAXIMA_PASSWORD = 72;

const validarRegistro = [
  body('nombre')
    .isString()
    .withMessage('El nombre debe ser texto')
    .bail()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('El nombre debe tener entre 3 y 100 caracteres'),
  body('email')
    .isEmail()
    .withMessage('Debe proporcionar un correo electrónico válido')
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('La contraseña debe ser texto')
    .bail()
    .isLength({ min: LONGITUD_MINIMA_PASSWORD, max: LONGITUD_MAXIMA_PASSWORD })
    .withMessage(
      `La contraseña debe tener entre ${LONGITUD_MINIMA_PASSWORD} y ${LONGITUD_MAXIMA_PASSWORD} caracteres`,
    ),
  body('rol')
    .isIn(Object.values(ROLES))
    .withMessage(`El rol debe ser uno de: ${Object.values(ROLES).join(', ')}`),
];

const validarLogin = [
  body('email')
    .isEmail()
    .withMessage('Debe proporcionar un correo electrónico válido')
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('La contraseña debe ser texto')
    .bail()
    .notEmpty()
    .withMessage('La contraseña es obligatoria'),
];

module.exports = { validarRegistro, validarLogin };
