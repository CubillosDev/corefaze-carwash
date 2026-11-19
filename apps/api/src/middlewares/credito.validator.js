const { body, param, query } = require('express-validator');

// ADR 0007: medio del pago de crédito y formato del número de vale.
const MEDIOS_PAGO_CREDITO = ['transferencia', 'cheque', 'efectivo'];
const PATRON_VALE = /^[A-Za-z0-9-]{3,30}$/;

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
  body('medio')
    .isIn(MEDIOS_PAGO_CREDITO)
    .withMessage(`medio es obligatorio y debe ser uno de: ${MEDIOS_PAGO_CREDITO.join(', ')}`),
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

const numeroVale = (campo) =>
  body(campo)
    .isString()
    .withMessage(`${campo} es obligatorio`)
    .bail()
    .trim()
    .matches(PATRON_VALE)
    .withMessage('El número de vale tiene de 3 a 30 letras, números o guiones')
    .customSanitizer((valor) => valor.toUpperCase());

/** GET /api/credito/clientes/:id/ordenes */
const validarOrdenesDeCliente = [
  query('tipo')
    .optional()
    .isIn(['pendientes', 'pagadas'])
    .withMessage('tipo debe ser pendientes o pagadas'),
];

/** PATCH /api/credito/clientes/:id/condiciones: cada campo puede quedar vacío (null). */
const validarCondiciones = [
  body('cupoCredito')
    .optional({ values: 'null' })
    .isInt({ min: 1, max: 1000000000 })
    .withMessage('cupoCredito debe ser un entero positivo')
    .toInt(),
  body('diaCorte')
    .optional({ values: 'null' })
    .isInt({ min: 1, max: 31 })
    .withMessage('diaCorte debe ser un día del mes (1 a 31)')
    .toInt(),
  body('contacto')
    .optional({ values: 'null' })
    .isString()
    .withMessage('contacto debe ser texto')
    .bail()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('contacto debe tener entre 3 y 100 caracteres'),
];

/** POST /api/credito/vales */
const validarRegistrarVale = [
  body('ordenId').isInt({ min: 1 }).withMessage('ordenId debe ser un entero positivo').toInt(),
  numeroVale('numero'),
];

/** POST /api/credito/vales/verificacion */
const validarVerificarVale = [
  body('clienteId').isInt({ min: 1 }).withMessage('clienteId debe ser un entero positivo').toInt(),
  numeroVale('numero'),
];

/** PATCH /api/credito/vales/:ordenId */
const validarMarcarVale = [
  param('ordenId').isInt({ min: 1 }).withMessage('ordenId debe ser un entero positivo').toInt(),
  body('verificado').isBoolean({ strict: true }).withMessage('verificado debe ser true o false'),
];

module.exports = {
  MEDIOS_PAGO_CREDITO,
  validarRegistrarPago,
  validarFiltroListarPagos,
  validarOrdenesDeCliente,
  validarCondiciones,
  validarRegistrarVale,
  validarVerificarVale,
  validarMarcarVale,
};
