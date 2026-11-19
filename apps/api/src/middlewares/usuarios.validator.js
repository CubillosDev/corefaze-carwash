const { body, query } = require('express-validator');
const { ROLES } = require('../constants/dominio');

const PAGINA_MINIMA = 1;
const POR_PAGINA_MINIMO = 1;
const POR_PAGINA_MAXIMO = 100;
const BUSQUEDA_LONGITUD_MAXIMA = 100;

/** GET /api/usuarios: todos los filtros son opcionales. */
const validarListar = [
  query('rol')
    .optional()
    .isIn(ROLES)
    .withMessage(`rol debe ser uno de: ${ROLES.join(', ')}`),
  query('activo')
    .optional()
    .isBoolean()
    .withMessage('activo debe ser un valor booleano (true o false)')
    .toBoolean(),
  query('busqueda')
    .optional()
    .isString()
    .withMessage('busqueda debe ser texto')
    .bail()
    .trim()
    .isLength({ min: 1, max: BUSQUEDA_LONGITUD_MAXIMA })
    .withMessage(`busqueda debe tener entre 1 y ${BUSQUEDA_LONGITUD_MAXIMA} caracteres`),
  query('pagina')
    .optional()
    .isInt({ min: PAGINA_MINIMA })
    .withMessage('pagina debe ser un entero mayor o igual a 1')
    .toInt(),
  query('porPagina')
    .optional()
    .isInt({ min: POR_PAGINA_MINIMO, max: POR_PAGINA_MAXIMO })
    .withMessage(`porPagina debe ser un entero entre ${POR_PAGINA_MINIMO} y ${POR_PAGINA_MAXIMO}`)
    .toInt(),
];

/** PATCH /api/usuarios/:id/estado: único campo del body. */
const validarCambioDeEstado = [
  body('activo')
    .isBoolean()
    .withMessage('activo debe ser un valor booleano (true o false)')
    .toBoolean(),
];

module.exports = { validarListar, validarCambioDeEstado };
