const { body, query } = require('express-validator');
const { MEDIOS_PAGO, ESTADOS_ORDEN, LIMITES } = require('../constants/dominio');

/** YYYY-MM-DD en hora local, para comparar solo la parte de fecha (sin horas). */
const obtenerFechaLocal = (fecha) => {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
};

const noEsFechaFutura = (fecha) => String(fecha).slice(0, 10) <= obtenerFechaLocal(new Date());

const validarFecha = () =>
  body('fecha')
    .isISO8601({ strict: true })
    .withMessage('La fecha debe tener un formato ISO 8601 válido')
    .bail()
    .custom(noEsFechaFutura)
    .withMessage('La fecha no puede ser futura');

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

/**
 * POST /api/ordenes-lavado: todos los campos obligatorios son requeridos.
 * "valor" y "estado" no forman parte de este contrato en absoluto: el
 * servidor los controla por completo (R4) y no se declara ninguna regla
 * para ellos, así que matchedData/validar los descarta igual que en los
 * demás validadores del proyecto.
 */
const validarCrear = [
  validarFecha(),
  validarTurno(),
  validarVehiculoId(),
  validarServicioId(),
  validarColaboradorId(),
  validarMedioPago(),
  ...validarClienteId(),
  validarAutorizaMotor(),
  validarObservaciones(),
];

/** PATCH /api/ordenes-lavado/:id/estado: este recurso no tiene PUT, solo cambio de estado. */
const validarCambioDeEstado = [
  body('estado')
    .isIn(Object.values(ESTADOS_ORDEN))
    .withMessage(`El estado debe ser uno de: ${Object.values(ESTADOS_ORDEN).join(', ')}`),
];

/** GET /api/ordenes-lavado: filtro opcional por fecha exacta. */
const validarFiltroListar = [
  query('fecha')
    .optional()
    .isISO8601()
    .withMessage('La fecha debe tener un formato ISO 8601 válido'),
];

module.exports = { validarCrear, validarCambioDeEstado, validarFiltroListar };
