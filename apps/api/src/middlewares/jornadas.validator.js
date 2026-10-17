const { query, body } = require('express-validator');
const { ESTADOS_JORNADA } = require('../constants/dominio');

/**
 * GET /api/jornadas: desde/hasta son opcionales. No hay validador de
 * body para abrir: la fecha la controla el servidor y no recibe body.
 */
const validarFiltroListar = [
  query('desde').optional().isISO8601().withMessage('desde debe tener un formato ISO 8601 válido'),
  query('hasta').optional().isISO8601().withMessage('hasta debe tener un formato ISO 8601 válido'),
];

/**
 * PATCH /api/jornadas/:id/estado: único endpoint de cambio de estado
 * (reemplaza los antiguos cerrar/reabrir). Solo valida formato —que
 * "estado" sea uno de los valores del dominio—; cuál transición es
 * válida según el estado actual de la jornada es una regla de negocio
 * que decide jornadas.service.js, no este validador.
 */
const validarCambioDeEstado = [
  body('estado')
    .isIn(Object.values(ESTADOS_JORNADA))
    .withMessage(`El estado debe ser uno de: ${Object.values(ESTADOS_JORNADA).join(', ')}`),
];

module.exports = { validarFiltroListar, validarCambioDeEstado };
