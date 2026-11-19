const { Router } = require('express');
const { obtenerResumen, obtenerIngresosPorHora } = require('../controllers/reportes.controller');
const { validarResumen, validarIngresosPorHora } = require('../middlewares/reportes.validator');
const { validar } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');

const router = Router();

// Los reportes del negocio son de administración. La curva de ingresos
// del día la ve también soporte, porque está en el tablero de inicio.
const ADMINISTRACION = autorizarRoles(ROLES_ENUM.SUPERADMIN, ROLES_ENUM.ADMINISTRADOR);
const OPERACION = autorizarRoles(
  ROLES_ENUM.SUPERADMIN,
  ROLES_ENUM.ADMINISTRADOR,
  ROLES_ENUM.SOPORTE,
);

/**
 * @swagger
 * /api/reportes/resumen:
 *   get:
 *     tags: [Reportes]
 *     summary: Reporte de un periodo
 *     description: >
 *       Ingresos y servicios por día, mix de servicios y colaboradores (con su
 *       comisión), más los totales del periodo anterior de la misma duración.
 *       Sin órdenes canceladas. Máximo 366 días.
 *     parameters:
 *       - { in: query, name: desde, required: true, schema: { type: string, format: date } }
 *       - { in: query, name: hasta, required: true, schema: { type: string, format: date } }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Reporte del periodo }
 *       400: { description: Fechas inválidas }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Solo superadmin o administrador }
 */
router.get('/resumen', autenticarJWT, ADMINISTRACION, validarResumen, validar, obtenerResumen);

/**
 * @swagger
 * /api/reportes/ingresos-por-hora:
 *   get:
 *     tags: [Reportes]
 *     summary: Ingresos por hora de un día y de la jornada anterior
 *     parameters:
 *       - { in: query, name: fecha, required: false, schema: { type: string, format: date } }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Curva de ingresos por hora }
 *       400: { description: Fecha inválida }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 */
router.get(
  '/ingresos-por-hora',
  autenticarJWT,
  OPERACION,
  validarIngresosPorHora,
  validar,
  obtenerIngresosPorHora,
);

module.exports = router;
