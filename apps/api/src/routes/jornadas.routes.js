const { Router } = require('express');
const { param } = require('express-validator');
const {
  listar,
  obtenerPorId,
  abrir,
  cerrar,
  reabrir,
} = require('../controllers/jornadas.controller');
const { validarFiltroListar } = require('../middlewares/jornadas.validator');
const { validar } = require('../middlewares/validar.middleware');

const router = Router();

const validarIdDeUrl = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

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
 *           type: integer
 *           nullable: true
 *           description: Null por ahora; esta ruta solo exige API Key, todavía no JWT.
 *         cerradaEn:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         cerradaPor:
 *           type: integer
 *           nullable: true
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
 *     responses:
 *       200:
 *         description: Lista de jornadas
 *       400:
 *         description: desde/hasta con formato inválido
 */
router.get('/', validarFiltroListar, validar, listar);

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
 *     responses:
 *       200:
 *         description: Jornada encontrada
 *       400:
 *         description: Id inválido
 *       404:
 *         description: Jornada no encontrada
 */
router.get('/:id', validarIdDeUrl, validar, obtenerPorId);

/**
 * @swagger
 * /api/jornadas/abrir:
 *   post:
 *     tags: [Jornadas]
 *     summary: Abrir la jornada del día
 *     description: >
 *       La fecha la fija siempre el servidor (la de hoy); el cliente no la
 *       envía y este endpoint no recibe body. Solo puede existir una
 *       jornada abierta a la vez en todo el sistema, y solo puede existir
 *       una jornada por fecha calendario.
 *     responses:
 *       201:
 *         description: Jornada abierta correctamente
 *       409:
 *         description: Ya existe una jornada abierta, o ya existe una jornada registrada para hoy
 */
router.post('/abrir', abrir);

/**
 * @swagger
 * /api/jornadas/{id}/cerrar:
 *   patch:
 *     tags: [Jornadas]
 *     summary: Cerrar una jornada abierta
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Jornada cerrada correctamente
 *       400:
 *         description: Id inválido
 *       404:
 *         description: Jornada no encontrada
 *       409:
 *         description: Solo se puede cerrar una jornada abierta
 */
router.patch('/:id/cerrar', validarIdDeUrl, validar, cerrar);

/**
 * @swagger
 * /api/jornadas/{id}/reabrir:
 *   patch:
 *     tags: [Jornadas]
 *     summary: Reabrir una jornada cerrada
 *     description: >
 *       Pensado para rol DUEÑO; el RBAC por rol todavía no existe en el
 *       proyecto, así que este endpoint no lo exige todavía. Cada
 *       reapertura queda registrada en el arreglo "reaperturas" de la
 *       jornada como auditoría mínima.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Jornada reabierta correctamente
 *       400:
 *         description: Id inválido
 *       404:
 *         description: Jornada no encontrada
 *       409:
 *         description: Solo se puede reabrir una jornada cerrada, o ya hay otra jornada abierta
 */
router.patch('/:id/reabrir', validarIdDeUrl, validar, reabrir);

module.exports = router;
