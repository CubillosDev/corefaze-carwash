const { body } = require('express-validator');

const LONGITUD_MINIMA_PASSWORD = 10;
// bcrypt trunca silenciosamente cualquier entrada más allá de 72 bytes;
// limitar aquí evita que una contraseña más larga se recorte sin avisar.
const LONGITUD_MAXIMA_PASSWORD = 72;

/**
 * El registro público NUNCA acepta "rol": el cliente no decide su propio
 * nivel de acceso. Toda cuenta nace en estado "pendiente" (ver
 * usuarios.service.js); solo un superadmin puede asignar un rol operativo
 * después, a través de una operación administrativa protegida.
 */
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
