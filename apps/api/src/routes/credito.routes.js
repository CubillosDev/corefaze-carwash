const { Router } = require('express');
const {
  listarClientes,
  listarOrdenesPendientes,
  listarPagos,
  obtenerPagoPorId,
  registrarPago,
} = require('../controllers/credito.controller');
const {
  validarRegistrarPago,
  validarFiltroListarPagos,
} = require('../middlewares/credito.validator');
const { validar, validarIdDeUrl } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');

const router = Router();

// RBAC (SCRUM-160): consultar (saldos, órdenes pendientes, historial de
// pagos) queda abierto a superadmin/administrador/soporte, igual que
// clientes/órdenes; registrar un pago (mueve dinero) queda reservado a
// superadmin/administrador, igual que colaboradores.
const PUEDEN_CONSULTAR = autorizarRoles(
  ROLES_ENUM.SUPERADMIN,
  ROLES_ENUM.ADMINISTRADOR,
  ROLES_ENUM.SOPORTE,
);
const PUEDEN_PAGAR = autorizarRoles(ROLES_ENUM.SUPERADMIN, ROLES_ENUM.ADMINISTRADOR);

/**
 * @swagger
 * components:
 *   schemas:
 *     PagoCreditoRegistrar:
 *       type: object
 *       required: [clienteId, ordenIds]
 *       properties:
 *         clienteId:
 *           type: integer
 *           example: 1
 *         ordenIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: Ids de las órdenes a crédito a pagar (todas del mismo cliente, entregadas, sin pago previo).
 *           example: [10, 11, 12]
 */

/**
 * @swagger
 * /api/credito/clientes:
 *   get:
 *     tags: [Crédito]
 *     summary: Listar clientes con crédito habilitado y su saldo pendiente
 *     description: >
 *       Saldo pendiente = suma de órdenes a crédito no canceladas y sin
 *       pago asociado, sin importar su estado operativo.
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de clientes con crédito habilitado
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar crédito
 */
router.get('/clientes', autenticarJWT, PUEDEN_CONSULTAR, listarClientes);

/**
 * @swagger
 * /api/credito/clientes/{id}/ordenes-pendientes:
 *   get:
 *     tags: [Crédito]
 *     summary: Listar las órdenes de un cliente que se pueden pagar ahora
 *     description: >
 *       Solo órdenes a crédito, en estado "entregada" y sin pago previo
 *       (R11): el conjunto exacto de ids válido para ordenIds al registrar
 *       un pago.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Órdenes pendientes de pago del cliente
 *       400:
 *         description: Id inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar crédito
 *       404:
 *         description: Cliente no encontrado
 */
router.get(
  '/clientes/:id/ordenes-pendientes',
  autenticarJWT,
  PUEDEN_CONSULTAR,
  validarIdDeUrl,
  validar,
  listarOrdenesPendientes,
);

/**
 * @swagger
 * /api/credito/pagos:
 *   get:
 *     tags: [Crédito]
 *     summary: Listar el historial de pagos de crédito
 *     parameters:
 *       - in: query
 *         name: clienteId
 *         required: false
 *         schema:
 *           type: integer
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pagos de crédito
 *       400:
 *         description: clienteId inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar crédito
 */
router.get(
  '/pagos',
  autenticarJWT,
  PUEDEN_CONSULTAR,
  validarFiltroListarPagos,
  validar,
  listarPagos,
);

/**
 * @swagger
 * /api/credito/pagos/{id}:
 *   get:
 *     tags: [Crédito]
 *     summary: Obtener un pago de crédito por id, con sus órdenes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Pago encontrado
 *       400:
 *         description: Id inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar crédito
 *       404:
 *         description: Pago no encontrado
 */
router.get(
  '/pagos/:id',
  autenticarJWT,
  PUEDEN_CONSULTAR,
  validarIdDeUrl,
  validar,
  obtenerPagoPorId,
);

/**
 * @swagger
 * /api/credito/pagos:
 *   post:
 *     tags: [Crédito]
 *     summary: Registrar el pago completo de un conjunto de órdenes a crédito
 *     description: >
 *       Todo o nada: si cualquier orden indicada no existe, no es del
 *       cliente, no es a crédito, no está entregada o ya tiene un pago, no
 *       se paga nada (ver registrar_pago_credito en la base de datos). No
 *       se admiten abonos parciales, cupo, vales ni fecha de corte.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PagoCreditoRegistrar'
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201:
 *         description: Pago de crédito registrado correctamente
 *       400:
 *         description: Datos inválidos (clienteId, ordenIds vacío o con ids repetidos)
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 *       404:
 *         description: El cliente, o alguna de las órdenes indicadas, no existe
 *       409:
 *         description: Alguna orden no es del cliente, no es a crédito, no está entregada, o ya tiene un pago registrado
 */
router.post('/pagos', autenticarJWT, PUEDEN_PAGAR, validarRegistrarPago, validar, registrarPago);

module.exports = router;
