const { Router } = require('express');
const {
  obtenerQuincena,
  registrarDescuento,
  liquidar,
  listarLiquidaciones,
} = require('../controllers/nomina.controller');
const {
  validarQuincena,
  validarDescuento,
  validarLiquidacion,
} = require('../middlewares/nomina.validator');
const { validar } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');

const router = Router();

// La nómina mueve dinero del equipo: solo superadmin y administrador.
const ADMINISTRACION = autorizarRoles(ROLES_ENUM.SUPERADMIN, ROLES_ENUM.ADMINISTRADOR);

/**
 * @swagger
 * /api/nomina/quincena:
 *   get:
 *     tags: [Nómina]
 *     summary: Nómina de la quincena que contiene una fecha
 *     description: >
 *       Por colaborador: servicios, producido, comisión, descuentos por tipo,
 *       neto y saldo pendiente (el mismo cálculo de liquidar_quincena), más
 *       los descuentos del periodo, la liquidación si ya se hizo y si ya se
 *       puede liquidar. Por defecto, la quincena de hoy.
 *     parameters:
 *       - { in: query, name: fecha, required: false, schema: { type: string, format: date } }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Nómina de la quincena }
 *       400: { description: Fecha inválida }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Solo superadmin o administrador }
 */
router.get('/quincena', autenticarJWT, ADMINISTRACION, validarQuincena, validar, obtenerQuincena);

/**
 * @swagger
 * /api/nomina/descuentos:
 *   post:
 *     tags: [Nómina]
 *     summary: Registrar un préstamo, jabón o multa con la fecha de hoy
 *     description: >
 *       El préstamo no puede superar la comisión disponible de la quincena
 *       (registrar_descuento, ADR 0006). El cxc lo crea la liquidación.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [colaboradorId, tipo, valor]
 *             properties:
 *               colaboradorId: { type: integer }
 *               tipo: { type: string, enum: [prestamo, jabon, multa] }
 *               valor: { type: integer }
 *               observacion: { type: string, nullable: true }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201: { description: Descuento registrado }
 *       400: { description: Datos inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Solo superadmin o administrador }
 *       404: { description: El colaborador no existe }
 *       409: { description: Supera la comisión disponible, colaborador inactivo o quincena ya liquidada }
 */
router.post(
  '/descuentos',
  autenticarJWT,
  ADMINISTRACION,
  validarDescuento,
  validar,
  registrarDescuento,
);

/**
 * @swagger
 * /api/nomina/liquidaciones:
 *   get:
 *     tags: [Nómina]
 *     summary: Historial de liquidaciones
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Liquidaciones, de la más reciente a la más antigua }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Solo superadmin o administrador }
 *   post:
 *     tags: [Nómina]
 *     summary: Liquidar una quincena terminada
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [inicio, fin]
 *             properties:
 *               inicio: { type: string, format: date }
 *               fin: { type: string, format: date }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201: { description: Quincena liquidada }
 *       400: { description: Fechas inválidas }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Solo superadmin o administrador }
 *       409: { description: No es una quincena, no ha terminado, tiene órdenes abiertas o ya se liquidó }
 */
router.get('/liquidaciones', autenticarJWT, ADMINISTRACION, listarLiquidaciones);
router.post('/liquidaciones', autenticarJWT, ADMINISTRACION, validarLiquidacion, validar, liquidar);

module.exports = router;
