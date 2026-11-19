const { Router } = require('express');
const {
  listarClientes,
  listarOrdenesPendientes,
  listarPagos,
  obtenerPagoPorId,
  registrarPago,
  listarOrdenesDeCliente,
  actualizarCondiciones,
  registrarVale,
  verificarVale,
  marcarVale,
} = require('../controllers/credito.controller');
const {
  validarRegistrarPago,
  validarFiltroListarPagos,
  validarOrdenesDeCliente,
  validarCondiciones,
  validarRegistrarVale,
  validarVerificarVale,
  validarMarcarVale,
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
 *       required: [clienteId, ordenIds, medio]
 *       properties:
 *         clienteId:
 *           type: integer
 *           example: 1
 *         ordenIds:
 *           type: array
 *           items:
 *             type: integer
 *           description: >
 *             Ids de las órdenes a crédito a pagar (todas del mismo cliente, entregadas, sin pago
 *             previo, con su vale verificado).
 *           example: [10, 11, 12]
 *         medio:
 *           type: string
 *           enum: [transferencia, cheque, efectivo]
 *           description: Obligatorio. Cómo pagó la empresa; queda registrado en el pago.
 *           example: transferencia
 */

/**
 * @swagger
 * /api/credito/clientes:
 *   get:
 *     tags: [Crédito]
 *     summary: Listar clientes con crédito habilitado o con deuda pendiente
 *     description: >
 *       Incluye clientes con creditoHabilitado=true, y también los que ya
 *       no lo tienen habilitado pero siguen con deuda sin pagar (la deuda
 *       no se borra al deshabilitar el crédito). Por cliente: saldoPendiente
 *       (todas las órdenes a crédito no canceladas y sin pago, sin importar
 *       su estado operativo) y saldoPagable/cantidadOrdenesPagables (el
 *       subconjunto ya 'entregada', lo que se puede pagar ahora).
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
 *     summary: Listar el historial de pagos de crédito, paginado
 *     parameters:
 *       - in: query
 *         name: clienteId
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pagina
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: porPagina
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Página de pagos de crédito, con total y totalPaginas
 *       400:
 *         description: clienteId, pagina o porPagina inválidos
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
 *       Todo o nada: exige que TODAS las órdenes indicadas tengan su vale
 *       verificado (ver POST /api/credito/vales/verificacion); si cualquiera
 *       no lo tiene, o no existe, no es del cliente, no es a crédito, no
 *       está entregada o ya tiene un pago, no se paga nada (ver
 *       registrar_pago_credito_con_medio en la base de datos). El medio de
 *       pago es obligatorio y queda registrado. No se admiten abonos
 *       parciales, cupo ni fecha de corte.
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
 *         description: Datos inválidos (clienteId, ordenIds vacío o con ids repetidos, medio faltante o inválido)
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 *       404:
 *         description: El cliente, o alguna de las órdenes indicadas, no existe
 *       409:
 *         description: >
 *           Alguna orden no es del cliente, no es a crédito, no está entregada, ya tiene un pago
 *           registrado, o no tiene su vale verificado
 */
router.post('/pagos', autenticarJWT, PUEDEN_PAGAR, validarRegistrarPago, validar, registrarPago);

// ---------------------------------------------------------------------
// ADR 0007: pestañas del diseño, condiciones de la empresa y vales.
// Recibir y verificar vales es operación diaria (también soporte); fijar
// cupo y corte, como pagar, queda para superadmin y administrador.
// ---------------------------------------------------------------------

/**
 * @swagger
 * /api/credito/clientes/{id}/ordenes:
 *   get:
 *     tags: [Crédito]
 *     summary: Órdenes a crédito de una empresa, pendientes o pagadas
 *     description: >
 *       pendientes = sin pago y no canceladas (cualquier estado), con su vale;
 *       pagadas = con su pago (fecha y medio).
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: query, name: tipo, required: false, schema: { type: string, enum: [pendientes, pagadas] } }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Órdenes de la empresa }
 *       400: { description: Parámetros inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *       404: { description: Cliente no encontrado }
 */
router.get(
  '/clientes/:id/ordenes',
  autenticarJWT,
  PUEDEN_CONSULTAR,
  validarIdDeUrl,
  validarOrdenesDeCliente,
  validar,
  listarOrdenesDeCliente,
);

/**
 * @swagger
 * /api/credito/clientes/{id}/condiciones:
 *   patch:
 *     tags: [Crédito]
 *     summary: Cupo, día de corte y contacto de una empresa
 *     description: El cupo es un tope de referencia; superarlo avisa, no bloquea.
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cupoCredito: { type: integer, nullable: true, example: 3000000 }
 *               diaCorte: { type: integer, nullable: true, example: 30 }
 *               contacto: { type: string, nullable: true }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Condiciones actualizadas }
 *       400: { description: Datos inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Solo superadmin o administrador }
 *       404: { description: Cliente no encontrado }
 *       409: { description: El cliente no es una empresa }
 */
router.patch(
  '/clientes/:id/condiciones',
  autenticarJWT,
  PUEDEN_PAGAR,
  validarIdDeUrl,
  validarCondiciones,
  validar,
  actualizarCondiciones,
);

/**
 * @swagger
 * /api/credito/vales:
 *   post:
 *     tags: [Crédito]
 *     summary: Registrar el vale de una orden a crédito que no lo tiene
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ordenId, numero]
 *             properties:
 *               ordenId: { type: integer }
 *               numero: { type: string, example: TA-1234 }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201: { description: Vale registrado }
 *       400: { description: Datos inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *       404: { description: Orden no encontrada }
 *       409: { description: La orden no es a crédito, ya tiene vale o el número ya existe }
 */
router.post('/vales', autenticarJWT, PUEDEN_CONSULTAR, validarRegistrarVale, validar, registrarVale);

/**
 * @swagger
 * /api/credito/vales/verificacion:
 *   post:
 *     tags: [Crédito]
 *     summary: Verificar un vale por su número
 *     description: >
 *       Si el vale es de la empresa y está pendiente, lo marca como recibido.
 *       resultado: coincide, pagado, otra_empresa o no_existe.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [clienteId, numero]
 *             properties:
 *               clienteId: { type: integer }
 *               numero: { type: string }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Resultado de la verificación }
 *       400: { description: Datos inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 */
router.post('/vales/verificacion', autenticarJWT, PUEDEN_CONSULTAR, validarVerificarVale, validar, verificarVale);

/**
 * @swagger
 * /api/credito/vales/{ordenId}:
 *   patch:
 *     tags: [Crédito]
 *     summary: Marcar o desmarcar el vale de una orden como recibido
 *     parameters:
 *       - { in: path, name: ordenId, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [verificado]
 *             properties:
 *               verificado: { type: boolean }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Vale actualizado }
 *       400: { description: Datos inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *       404: { description: La orden no tiene vale }
 *       409: { description: La orden ya está pagada }
 */
router.patch('/vales/:ordenId', autenticarJWT, PUEDEN_CONSULTAR, validarMarcarVale, validar, marcarVale);

module.exports = router;
