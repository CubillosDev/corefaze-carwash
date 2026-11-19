const { body, query } = require('express-validator');

/** Mismo criterio que tieneTipoVehiculoDuplicado en servicios.validator.js. */
const tieneIdsRepetidos = (ordenIds) => new Set(ordenIds).size !== ordenIds.length;

// Mismos límites que usuarios.validator.js (validarListar), para que
// GET /api/credito/pagos pagine con el mismo contrato que GET /api/usuarios.
const PAGINA_MINIMA = 1;
const POR_PAGINA_MINIMO = 1;
const POR_PAGINA_MAXIMO = 100;

/**
 * POST /api/credito/pagos: clienteId y al menos una orden, sin ids
 * repetidos. La validación de formato aquí es una verificación temprana
 * (400 más claro y rápido); la autoridad real sigue siendo
 * registrar_pago_credito(), que vuelve a exigir exactamente lo mismo
 * (ver credito.service.js).
 */
const validarRegistrarPago = [
  body('clienteId').isInt({ min: 1 }).withMessage('clienteId debe ser un entero positivo').toInt(),
  body('ordenIds')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos una orden para pagar')
    .bail()
    .custom((ordenIds) => !tieneIdsRepetidos(ordenIds))
    .withMessage('El arreglo de órdenes no puede tener ids repetidos'),
  body('ordenIds.*')
    .isInt({ min: 1 })
    .withMessage('Cada id de orden debe ser un entero positivo')
    .toInt(),
];

/** GET /api/credito/pagos: todos los filtros/paginación son opcionales. */
const validarFiltroListarPagos = [
  query('clienteId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('clienteId debe ser un entero positivo')
    .toInt(),
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

module.exports = { validarRegistrarPago, validarFiltroListarPagos };
