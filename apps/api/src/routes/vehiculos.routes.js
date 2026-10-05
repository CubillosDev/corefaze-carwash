const { Router } = require('express');
const { param } = require('express-validator');
const {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
} = require('../controllers/vehiculos.controller');
const { validarCrear, validarActualizar } = require('../middlewares/vehiculos.validator');
const { validar } = require('../middlewares/validar.middleware');

const router = Router();

const validarIdDeUrl = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     VehiculoCrear:
 *       type: object
 *       required: [placa, tipo, clienteId]
 *       properties:
 *         placa:
 *           type: string
 *           description: ABC123 (carro) o ABC12D (moto); se normaliza a mayúsculas.
 *           example: ABC123
 *         tipo:
 *           type: string
 *           enum: [automovil, camioneta, platon_7_pasajeros, moto_hasta_150cc, moto_desde_150cc]
 *           example: automovil
 *         marca:
 *           type: string
 *           example: Mazda
 *         color:
 *           type: string
 *           example: Rojo
 *         clienteId:
 *           type: integer
 *           example: 1
 *     VehiculoActualizar:
 *       type: object
 *       properties:
 *         placa:
 *           type: string
 *         tipo:
 *           type: string
 *           enum: [automovil, camioneta, platon_7_pasajeros, moto_hasta_150cc, moto_desde_150cc]
 *         marca:
 *           type: string
 *         color:
 *           type: string
 *         clienteId:
 *           type: integer
 */

/**
 * @swagger
 * /api/vehiculos:
 *   get:
 *     tags: [Vehículos]
 *     summary: Listar vehículos
 *     responses:
 *       200:
 *         description: Lista de vehículos
 */
router.get('/', listar);

/**
 * @swagger
 * /api/vehiculos/{id}:
 *   get:
 *     tags: [Vehículos]
 *     summary: Obtener un vehículo por id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vehículo encontrado
 *       400:
 *         description: Id inválido
 *       404:
 *         description: Vehículo no encontrado
 */
router.get('/:id', validarIdDeUrl, validar, obtenerPorId);

/**
 * @swagger
 * /api/vehiculos:
 *   post:
 *     tags: [Vehículos]
 *     summary: Registrar un vehículo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VehiculoCrear'
 *     responses:
 *       201:
 *         description: Vehículo registrado correctamente
 *       400:
 *         description: Datos inválidos o la placa no corresponde al tipo de vehículo
 *       404:
 *         description: El cliente indicado no existe
 *       409:
 *         description: Placa ya registrada
 */
router.post('/', validarCrear, validar, crear);

/**
 * @swagger
 * /api/vehiculos/{id}:
 *   put:
 *     tags: [Vehículos]
 *     summary: Actualizar un vehículo
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
 *             $ref: '#/components/schemas/VehiculoActualizar'
 *     responses:
 *       200:
 *         description: Vehículo actualizado correctamente
 *       400:
 *         description: Datos o id inválidos
 *       404:
 *         description: Vehículo o cliente no encontrado
 *       409:
 *         description: Placa ya registrada por otro vehículo
 */
router.put('/:id', validarIdDeUrl, validarActualizar, validar, actualizar);

/**
 * @swagger
 * /api/vehiculos/{id}:
 *   delete:
 *     tags: [Vehículos]
 *     summary: Eliminar un vehículo
 *     description: No se puede eliminar un vehículo que tenga lavados asociados.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Vehículo eliminado correctamente
 *       400:
 *         description: Id inválido
 *       404:
 *         description: Vehículo no encontrado
 *       409:
 *         description: El vehículo tiene lavados asociados
 */
router.delete('/:id', validarIdDeUrl, validar, eliminar);

module.exports = router;
