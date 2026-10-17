const { query } = require('express-validator');

/**
 * GET /api/jornadas: desde/hasta son opcionales. No hay validadores de
 * body para abrir/cerrar/reabrir: la fecha la controla el servidor y el
 * id viaja en el parámetro de ruta, no en el cuerpo.
 */
const validarFiltroListar = [
  query('desde').optional().isISO8601().withMessage('desde debe tener un formato ISO 8601 válido'),
  query('hasta').optional().isISO8601().withMessage('hasta debe tener un formato ISO 8601 válido'),
];

module.exports = { validarFiltroListar };
