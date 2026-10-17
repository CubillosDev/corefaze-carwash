const { body, query } = require('express-validator');
const { MEDIOS_PAGO, ESTADOS_ORDEN, LIMITES } = require('../constants/dominio');

const validarTurno = () =>
  body('turno')
    .isInt({ min: LIMITES.turno.min })
    .withMessage(`El turno debe ser un entero mayor o igual a ${LIMITES.turno.min}`)
    .toInt();

const validarVehiculoId = () =>
  body('vehiculoId')
    .isInt({ min: 1 })
    .withMessage('vehiculoId debe ser un entero positivo')
    .toInt();

const validarServicioId = () =>
  body('servicioId')
    .isInt({ min: 1 })
    .withMessage('servicioId debe ser un entero positivo')
    .toInt();

const validarColaboradorId = () =>
  body('colaboradorId')
    .isInt({ min: 1 })
    .withMessage('colaboradorId debe ser un entero positivo')
    .toInt();

const validarMedioPago = () =>
  body('medioPago')
    .isIn(Object.values(MEDIOS_PAGO))
    .withMessage(`medioPago debe ser uno de: ${Object.values(MEDIOS_PAGO).join(', ')}`);

/**
 * clienteId es opcional en general, pero se vuelve obligatorio cuando
 * medioPago es "credito" (R8). La segunda cadena corre siempre (no lleva
 * .optional()), precisamente para poder detectar su ausencia.
 */
const validarClienteId = () => [
  body('clienteId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('clienteId debe ser un entero positivo')
    .toInt(),
  body('clienteId').custom((clienteId, { req }) => {
    if (req.body.medioPago === MEDIOS_PAGO.CREDITO && clienteId === undefined) {
      throw new Error('clienteId es obligatorio cuando medioPago es credito');
    }
    return true;
  }),
];

const validarAutorizaMotor = () =>
  body('autorizaMotor')
    .optional()
    .isBoolean()
    .withMessage('autorizaMotor debe ser verdadero o falso')
    .toBoolean();

const validarObservaciones = () =>
  body('observaciones')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Las observaciones deben ser texto')
    .bail()
    .trim()
    .isLength({ max: LIMITES.observaciones.max })
    .withMessage(`Las observaciones no pueden superar los ${LIMITES.observaciones.max} caracteres`);

const validarMotivo = () =>
  body('motivo')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('El motivo debe ser texto')
    .bail()
    .trim()
    .isLength({ max: LIMITES.observaciones.max })
    .withMessage(`El motivo no puede superar los ${LIMITES.observaciones.max} caracteres`);

/**
 * POST /api/ordenes-lavado: todos los campos obligatorios son requeridos.
 * "fecha" no forma parte del contrato: la fija la jornada abierta, nunca
 * el cliente. "valor" y "estado" tampoco: el servidor los controla por
 * completo (R4), así que matchedData/validar los descarta igual que en
 * los demás validadores del proyecto.
 */
const validarCrear = [
  validarTurno(),
  validarVehiculoId(),
  validarServicioId(),
  validarColaboradorId(),
  validarMedioPago(),
  ...validarClienteId(),
  validarAutorizaMotor(),
  validarObservaciones(),
];

/**
 * PATCH /api/ordenes-lavado/:id: solo los campos no financieros son
 * editables (vehiculoId, colaboradorId, medioPago, clienteId,
 * observaciones), todos opcionales. servicioId, turno, autorizaMotor,
 * valor, estado, fecha y jornadaId no se declaran aquí, así que
 * matchedData/validar los descarta aunque el cliente los envíe.
 */
const validarEditar = [
  validarVehiculoId().optional(),
  validarColaboradorId().optional(),
  validarMedioPago().optional(),
  ...validarClienteId(),
  validarObservaciones(),
];

/**
 * PATCH /api/ordenes-lavado/:id/estado: este recurso no tiene PUT, solo
 * cambio de estado. "motivo" es opcional aquí a nivel de formato; que
 * sea obligatorio solo al cancelar es una regla de negocio y la decide
 * el service, no este validador.
 */
const validarCambioDeEstado = [
  body('estado')
    .isIn(Object.values(ESTADOS_ORDEN))
    .withMessage(`El estado debe ser uno de: ${Object.values(ESTADOS_ORDEN).join(', ')}`),
  validarMotivo(),
];

/** GET /api/ordenes-lavado: todos los filtros son opcionales y combinables. */
const validarFiltroListar = [
  query('fecha')
    .optional()
    .isISO8601()
    .withMessage('La fecha debe tener un formato ISO 8601 válido'),
  query('colaboradorId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('colaboradorId debe ser un entero positivo')
    .toInt(),
  query('servicioId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('servicioId debe ser un entero positivo')
    .toInt(),
  query('medioPago')
    .optional()
    .isIn(Object.values(MEDIOS_PAGO))
    .withMessage(`medioPago debe ser uno de: ${Object.values(MEDIOS_PAGO).join(', ')}`),
  query('jornadaId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('jornadaId debe ser un entero positivo')
    .toInt(),
];

module.exports = { validarCrear, validarEditar, validarCambioDeEstado, validarFiltroListar };
