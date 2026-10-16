const { Router } = require('express');
const { param } = require('express-validator');
const {
  listar,
  obtenerPorId,
  crear,
  cambiarEstado,
} = require('../controllers/ordenesLavado.controller');
const {
  validarCrear,
  validarCambioDeEstado,
  validarFiltroListar,
} = require('../middlewares/ordenesLavado.validator');
const { validar } = require('../middlewares/validar.middleware');

const router = Router();

const validarIdDeUrl = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     OrdenCrear:
 *       type: object
 *       required: [fecha, turno, vehiculoId, servicioId, colaboradorId, medioPago]
 *       properties:
 *         fecha:
 *           type: string
 *           format: date
 *           description: Fecha ISO 8601, no puede ser futura.
 *           example: '2026-01-10'
 *         turno:
 *           type: integer
 *           example: 1
 *         vehiculoId:
 *           type: integer
 *           example: 1
 *         servicioId:
 *           type: integer
 *           example: 1
 *         colaboradorId:
 *           type: integer
 *           example: 1
 *         medioPago:
 *           type: string
 *           enum: [efectivo, nequi, daviplata, bancolombia, datafono, credito]
 *           example: efectivo
 *         clienteId:
 *           type: integer
 *           description: Obligatorio solo si medioPago es "credito"; en cualquier otro caso se ignora.
 *           example: 1
 *         autorizaMotor:
 *           type: boolean
 *           description: Obligatorio en true si el servicio exige autorización para lavado de motor.
 *           example: false
 *         observaciones:
 *           type: string
 *           example: Rayón leve en la puerta derecha
 *       description: >
 *         "valor" y "estado" no forman parte de este contrato: el servidor
 *         siempre calcula el valor desde la tarifa del servicio y toda orden
 *         nueva nace en estado "registrada".
 */

/**
 * @swagger
 * /api/ordenes-lavado:
 *   get:
 *     tags: [Órdenes de lavado]
 *     summary: Listar órdenes de lavado
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtra las órdenes por fecha exacta (ISO 8601).
 *     responses:
 *       200:
 *         description: Lista de órdenes de lavado
 *       400:
 *         description: Fecha de filtro inválida
 */
router.get('/', validarFiltroListar, validar, listar);

/**
 * @swagger
 * /api/ordenes-lavado/{id}:
 *   get:
 *     tags: [Órdenes de lavado]
 *     summary: Obtener una orden de lavado por id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden de lavado encontrada
 *       400:
 *         description: Id inválido
 *       404:
 *         description: Orden de lavado no encontrada
 */
router.get('/:id', validarIdDeUrl, validar, obtenerPorId);

/**
 * @swagger
 * /api/ordenes-lavado:
 *   post:
 *     tags: [Órdenes de lavado]
 *     summary: Registrar una orden de lavado
 *     description: >
 *       Una orden es un registro auditable: no tiene PUT ni DELETE, solo se
 *       crea y cambia de estado. El valor nace siempre de la tarifa del
 *       servicio para el tipo de vehículo, nunca del cliente de la API.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrdenCrear'
 *     responses:
 *       201:
 *         description: Orden de lavado registrada correctamente
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: El vehículo, servicio, colaborador o cliente indicado no existe
 *       409:
 *         description: >
 *           Viola alguna regla de negocio (colaborador inactivo, servicio
 *           inactivo o sin tarifa para el tipo de vehículo, lavado de motor
 *           sin autorización, cliente sin crédito habilitado, turno ya
 *           ocupado para esa fecha, o el vehículo ya tiene una orden abierta)
 */
router.post('/', validarCrear, validar, crear);

/**
 * @swagger
 * /api/ordenes-lavado/{id}/estado:
 *   patch:
 *     tags: [Órdenes de lavado]
 *     summary: Cambiar el estado de una orden de lavado
 *     description: >
 *       Sigue la máquina de estados del dominio: una orden entregada o
 *       cancelada no puede volver a cambiar de estado, y no se pueden saltar
 *       ni retroceder estados.
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
 *                 enum: [registrada, en_proceso, terminada, entregada, cancelada]
 *                 example: en_proceso
 *     responses:
 *       200:
 *         description: Estado de la orden actualizado correctamente
 *       400:
 *         description: Estado o id inválidos
 *       404:
 *         description: Orden de lavado no encontrada
 *       409:
 *         description: La orden ya está cerrada, o la transición de estado no es válida
 */
router.patch('/:id/estado', validarIdDeUrl, validarCambioDeEstado, validar, cambiarEstado);

module.exports = router;
