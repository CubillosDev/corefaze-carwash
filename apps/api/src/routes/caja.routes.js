const { Router } = require('express');
const {
  obtenerEstado,
  abrir,
  registrarEgreso,
  registrarCobro,
  cerrar,
  reabrir,
} = require('../controllers/caja.controller');
const {
  validarFiltroEstado,
  validarApertura,
  validarEgreso,
  validarCobro,
  validarCierre,
} = require('../middlewares/caja.validator');
const { validar, validarIdDeUrl } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');

const router = Router();

// La caja es operación diaria: la usan los tres roles que operan el
// patio. Reabrir una caja ya arqueada queda para superadmin, igual que
// reabrir una jornada.
const PUEDEN_OPERAR = autorizarRoles(
  ROLES_ENUM.SUPERADMIN,
  ROLES_ENUM.ADMINISTRADOR,
  ROLES_ENUM.SOPORTE,
);
const PUEDEN_REABRIR = autorizarRoles(ROLES_ENUM.SUPERADMIN);

/**
 * @swagger
 * /api/caja:
 *   get:
 *     tags: [Caja]
 *     summary: Estado de la caja de una jornada
 *     description: >
 *       Por defecto la de la jornada abierta (o la última). Trae la caja, sus
 *       totales calculados en el servidor (cobrado, por medio, efectivo
 *       esperado, por cobrar), sus cobros y egresos, las órdenes terminadas
 *       por cobrar y las que siguen en el patio. Si quedó abierta una caja
 *       de otra jornada, la trae en `cajaAnterior` (su fecha y sus totales, con el
 *       efectivo esperado) para cerrarla con POST /api/caja/cierre antes de abrir la
 *       de la jornada actual; si no, `cajaAnterior` es null.
 *     parameters:
 *       - in: query
 *         name: jornadaId
 *         schema: { type: integer }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Estado de la caja }
 *       400: { description: jornadaId inválido }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *       404: { description: Jornada no encontrada }
 */
router.get('/', autenticarJWT, PUEDEN_OPERAR, validarFiltroEstado, validar, obtenerEstado);

/**
 * @swagger
 * /api/caja/apertura:
 *   post:
 *     tags: [Caja]
 *     summary: Abrir la caja de la jornada abierta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [baseInicial]
 *             properties:
 *               baseInicial: { type: integer, example: 100000 }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201: { description: Caja abierta }
 *       400: { description: Base inválida }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *       409: { description: No hay jornada abierta o la caja de la jornada ya se abrió }
 */
router.post('/apertura', autenticarJWT, PUEDEN_OPERAR, validarApertura, validar, abrir);

/**
 * @swagger
 * /api/caja/egresos:
 *   post:
 *     tags: [Caja]
 *     summary: Registrar un egreso de efectivo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [categoria, valor]
 *             properties:
 *               categoria: { type: string, enum: [insumos, almuerzos, servicios_publicos, otros] }
 *               concepto: { type: string, nullable: true }
 *               valor: { type: integer, example: 36000 }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201: { description: Egreso registrado }
 *       400: { description: Datos inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *       409: { description: La caja está cerrada }
 */
router.post('/egresos', autenticarJWT, PUEDEN_OPERAR, validarEgreso, validar, registrarEgreso);

/**
 * @swagger
 * /api/caja/cobros:
 *   post:
 *     tags: [Caja]
 *     summary: Cobrar y entregar una orden terminada
 *     description: >
 *       La orden pasa de terminada a entregada (la misma transición de
 *       transicionesOrden). El valor es el de la orden (R4). A crédito exige
 *       la empresa (R8) y el número de vale; en efectivo admite lo recibido
 *       y devuelve el cambio.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ordenId, medioPago]
 *             properties:
 *               ordenId: { type: integer }
 *               medioPago: { type: string, enum: [efectivo, nequi, daviplata, bancolombia, datafono, credito] }
 *               recibido: { type: integer, nullable: true }
 *               clienteId: { type: integer, nullable: true }
 *               numeroVale: { type: string, nullable: true }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201: { description: Cobro registrado, con la orden para el comprobante }
 *       400: { description: Datos inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *       404: { description: La orden no existe }
 *       409: { description: La orden no está terminada, la caja está cerrada, la empresa no tiene crédito o el vale ya existe }
 */
router.post('/cobros', autenticarJWT, PUEDEN_OPERAR, validarCobro, validar, registrarCobro);

/**
 * @swagger
 * /api/caja/cierre:
 *   post:
 *     tags: [Caja]
 *     summary: Cerrar la caja abierta con el arqueo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [efectivoContado]
 *             properties:
 *               efectivoContado: { type: integer }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Caja cerrada, con el esperado, lo contado y la diferencia }
 *       400: { description: Datos inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *       409: { description: No hay una caja abierta }
 */
router.post('/cierre', autenticarJWT, PUEDEN_OPERAR, validarCierre, validar, cerrar);

/**
 * @swagger
 * /api/caja/{id}/reapertura:
 *   post:
 *     tags: [Caja]
 *     summary: Reabrir una caja cerrada (solo superadmin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Caja reabierta }
 *       400: { description: Id inválido }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Solo superadmin }
 *       404: { description: Caja no encontrada }
 *       409: { description: La caja no está cerrada o ya hay otra abierta }
 */
router.post('/:id/reapertura', autenticarJWT, PUEDEN_REABRIR, validarIdDeUrl, validar, reabrir);

module.exports = router;
