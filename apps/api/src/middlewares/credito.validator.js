const { body, query } = require('express-validator');

/** Mismo criterio que tieneTipoVehiculoDuplicado en servicios.validator.js. */
const tieneIdsRepetidos = (ordenIds) => new Set(ordenIds).size !== ordenIds.length;

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

/** GET /api/credito/pagos: el filtro por cliente es opcional. */
const validarFiltroListarPagos = [
  query('clienteId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('clienteId debe ser un entero positivo')
    .toInt(),
];

module.exports = { validarRegistrarPago, validarFiltroListarPagos };
