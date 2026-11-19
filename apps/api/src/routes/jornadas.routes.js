const { Router } = require('express');
const {
  listar,
  obtenerPorId,
  abrir,
  cambiarEstado,
} = require('../controllers/jornadas.controller');
const { validarFiltroListar, validarCambioDeEstado } = require('../middlewares/jornadas.validator');
const { validar, validarIdDeUrl } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles, exigirSuperadminParaReabrir } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');

const router = Router();

// RBAC (SCRUM-139): abrir/cerrar la jornada es la operación central del
// día a día y queda disponible para superadmin/administrador/soporte.
// Reabrir es la excepción: ver exigirSuperadminParaReabrir, que corre más
// abajo en la cadena de PATCH /:id/estado porque depende del body (no se
// puede expresar como autorizarRoles(...) estático).
const PUEDEN_CONSULTAR = autorizarRoles(
  ROLES_ENUM.SUPERADMIN,
  ROLES_ENUM.ADMINISTRADOR,
  ROLES_ENUM.SOPORTE,
);
const PUEDEN_GESTIONAR = autorizarRoles(
  ROLES_ENUM.SUPERADMIN,
  ROLES_ENUM.ADMINISTRADOR,
  ROLES_ENUM.SOPORTE,
);

/**
 * @swagger
 * components:
 *   schemas:
 *     Jornada:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         fecha:
 *           type: string
 *           format: date
 *           description: Única por jornada; siempre la fija el servidor al abrir.
 *           example: '2026-01-10'
 *         estado:
 *           type: string
 *           enum: [abierta, cerrada]
 *           example: abierta
 *         abiertaEn:
 *           type: string
 *           format: date-time
 *         abiertaPor:
 *           type: string
 *           nullable: true
 *           description: Email del usuario autenticado que abrió la jornada (SCRUM-139).
 *           example: administrador@lavadero.com
 *         cerradaEn:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cerradaPor:
 *           type: string
 *           nullable: true
 *           description: Email del usuario autenticado que cerró la jornada (SCRUM-139).
 *           example: administrador@lavadero.com
 *         reaperturas:
 *           type: array
 *           description: Una entrada por cada vez que la jornada se reabre (auditoría mínima).
 *           items:
 *             type: object
 *             properties:
 *               en:
 *                 type: string
 *                 format: date-time
 *         unidades:
 *           type: integer
 *           description: Agregado derivado de las propias órdenes de la jornada (servicios no anulados). Nunca se guarda, se calcula al responder.
 *           example: 12
 *         ventaTotal:
 *           type: integer
 *           description: Agregado derivado de las propias órdenes de la jornada (suma de valor de los servicios no anulados). Nunca se guarda, se calcula al responder.
 *           example: 180000
 *         diferenciaCaja:
 *           type: integer
 *           nullable: true
 *           description: Siempre null por ahora; depende del cierre de caja (arqueo), que todavía no existe en el proyecto.
 *           example: null
 */

/**
 * @swagger
 * /api/jornadas:
 *   get:
 *     tags: [Jornadas]
 *     summary: Listar jornadas
 *     parameters:
 *       - in: query
 *         name: desde
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtra jornadas con fecha mayor o igual a esta.
 *       - in: query
 *         name: hasta
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtra jornadas con fecha menor o igual a esta.
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de jornadas
 *       400:
 *         description: desde/hasta con formato inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar jornadas
 */
router.get('/', autenticarJWT, PUEDEN_CONSULTAR, validarFiltroListar, validar, listar);

/**
 * @swagger
 * /api/jornadas/{id}:
 *   get:
 *     tags: [Jornadas]
 *     summary: Obtener una jornada por id
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
 *         description: Jornada encontrada
 *       400:
 *         description: Id inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar jornadas
 *       404:
 *         description: Jornada no encontrada
 */
router.get('/:id', autenticarJWT, PUEDEN_CONSULTAR, validarIdDeUrl, validar, obtenerPorId);

/**
 * @swagger
 * /api/jornadas:
 *   post:
 *     tags: [Jornadas]
 *     summary: Abrir la jornada del día
 *     description: >
 *       El verbo va en el método HTTP, no en la URL (no existe
 *       POST /api/jornadas/abrir). La fecha la fija siempre el servidor
 *       (la de hoy); el cliente no la envía y este endpoint no recibe
 *       body. Solo puede existir una jornada abierta a la vez en todo el
 *       sistema, y solo puede existir una jornada por fecha calendario.
 *       Queda registrado el email del usuario autenticado en "abiertaPor".
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201:
 *         description: Jornada abierta correctamente
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para abrir una jornada
 *       409:
 *         description: Ya existe una jornada abierta, o ya existe una jornada registrada para hoy
 */
router.post('/', autenticarJWT, PUEDEN_GESTIONAR, abrir);

/**
 * @swagger
 * /api/jornadas/{id}/estado:
 *   patch:
 *     tags: [Jornadas]
 *     summary: Cerrar o reabrir una jornada
 *     description: >
 *       Único endpoint de cambio de estado (reemplaza los antiguos
 *       PATCH /:id/cerrar y PATCH /:id/reabrir: el verbo va en el método
 *       HTTP, no en la URL). estado="cerrada" cierra una jornada abierta
 *       (disponible para superadmin/administrador/soporte);
 *       estado="abierta" reabre una jornada cerrada y está reservado
 *       únicamente a superadmin (SCRUM-139). Queda registrado el email
 *       del usuario autenticado en "cerradaPor". Cada reapertura además
 *       queda registrada en el arreglo "reaperturas" de la jornada como
 *       auditoría mínima.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [cerrada, abierta]
 *                 example: cerrada
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Jornada cerrada o reabierta correctamente, según el estado enviado
 *       400:
 *         description: Estado o id inválidos
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para esta operación (reabrir exige superadmin)
 *       404:
 *         description: Jornada no encontrada
 *       409:
 *         description: >
 *           Solo se puede cerrar una jornada abierta; solo se puede
 *           reabrir una jornada cerrada; o ya hay otra jornada abierta
 *           (al reabrir)
 */
router.patch(
  '/:id/estado',
  autenticarJWT,
  PUEDEN_GESTIONAR,
  validarIdDeUrl,
  validarCambioDeEstado,
  validar,
  exigirSuperadminParaReabrir,
  cambiarEstado,
);

module.exports = router;
