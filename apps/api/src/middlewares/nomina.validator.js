const { body, param, query } = require('express-validator');
const { TIPOS_DESCUENTO, LIMITES } = require('../constants/dominio');

// Mismos límites que usuarios.validator.js/credito.validator.js, para
// que GET /api/nomina/liquidaciones pagine con el mismo contrato.
const PAGINA_MINIMA = 1;
const POR_PAGINA_MINIMO = 1;
const POR_PAGINA_MAXIMO = 100;

/** :colaboradorId en la URL (distinto de validarIdDeUrl, que solo cubre :id). */
const validarColaboradorIdDeUrl = [
  param('colaboradorId')
    .isInt({ min: 1 })
    .withMessage('El colaboradorId debe ser un entero positivo')
    .toInt(),
];

/**
 * GET /api/nomina/quincenas/resumen: inicio y fin son obligatorios (sin
 * ellos no hay periodo que resumir). Formato ISO nada más — que sea
 * EXACTAMENTE una quincena real (1–15 o 16–fin de mes) lo valida
 * limites_quincena() en nomina.service.js, nunca reimplementado aquí.
 */
const validarResumenQuincena = [
  query('inicio').isISO8601().withMessage('inicio debe ser una fecha ISO (YYYY-MM-DD)'),
  query('fin').isISO8601().withMessage('fin debe ser una fecha ISO (YYYY-MM-DD)'),
];

/** GET /api/nomina/colaboradores/:colaboradorId/descuentos: inicio/fin obligatorios, cualquier rango. */
const validarDescuentosDeColaborador = [
  ...validarColaboradorIdDeUrl,
  query('inicio').isISO8601().withMessage('inicio debe ser una fecha ISO (YYYY-MM-DD)'),
  query('fin').isISO8601().withMessage('fin debe ser una fecha ISO (YYYY-MM-DD)'),
];

/**
 * POST /api/nomina/descuentos: la validación de formato aquí es una
 * verificación temprana (400 más claro y rápido); la autoridad real
 * sigue siendo registrar_descuento() (ver nomina.service.js).
 */
const validarRegistrarDescuento = [
  body('colaboradorId')
    .isInt({ min: 1 })
    .withMessage('colaboradorId debe ser un entero positivo')
    .toInt(),
  body('tipo')
    .isIn(Object.values(TIPOS_DESCUENTO))
    .withMessage(`tipo debe ser uno de: ${Object.values(TIPOS_DESCUENTO).join(', ')}`),
  body('valor').isInt({ min: 1 }).withMessage('valor debe ser un entero positivo').toInt(),
  body('fecha').isISO8601().withMessage('fecha debe ser una fecha ISO (YYYY-MM-DD)'),
  body('observacion')
    .optional()
    .isString()
    .withMessage('observacion debe ser texto')
    .bail()
    .trim()
    .isLength({ max: LIMITES.observaciones.max })
    .withMessage(`observacion debe tener máximo ${LIMITES.observaciones.max} caracteres`),
];

/** POST /api/nomina/quincenas/liquidar: solo inicio/fin — p_hoy nunca lo manda el cliente. */
const validarLiquidarQuincena = [
  body('inicio').isISO8601().withMessage('inicio debe ser una fecha ISO (YYYY-MM-DD)'),
  body('fin').isISO8601().withMessage('fin debe ser una fecha ISO (YYYY-MM-DD)'),
];

/** GET /api/nomina/liquidaciones: paginación opcional. */
const validarFiltroListarLiquidaciones = [
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

module.exports = {
  validarColaboradorIdDeUrl,
  validarResumenQuincena,
  validarDescuentosDeColaborador,
  validarRegistrarDescuento,
  validarLiquidarQuincena,
  validarFiltroListarLiquidaciones,
};
