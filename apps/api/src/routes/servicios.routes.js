const { Router } = require('express');
const {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
} = require('../controllers/servicios.controller');
const { validarCrear, validarActualizar } = require('../middlewares/servicios.validator');
const { validar, validarIdDeUrl } = require('../middlewares/validar.middleware');

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ServicioCrear:
 *       type: object
 *       required: [numero, nombre, tarifas]
 *       properties:
 *         numero:
 *           type: integer
 *           description: Identificador de catálogo (distinto del id interno).
 *           example: 1
 *         nombre:
 *           type: string
 *           example: Lavado básico
 *         descripcion:
 *           type: string
 *           example: Lavado exterior con shampoo
 *         categoria:
 *           type: string
 *           example: basico
 *         tarifas:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required: [tipoVehiculo, valor]
 *             properties:
 *               tipoVehiculo:
 *                 type: string
 *                 enum: [automovil, camioneta, platon_7_pasajeros, moto_hasta_150cc, moto_desde_150cc]
 *                 example: automovil
 *               valor:
 *                 type: integer
 *                 example: 15000
 *           example:
 *             - tipoVehiculo: automovil
 *               valor: 15000
 *             - tipoVehiculo: camioneta
 *               valor: 20000
 *     ServicioActualizar:
 *       type: object
 *       properties:
 *         numero:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           example: Lavado premium
 *         descripcion:
 *           type: string
 *           example: Incluye encerado
 *         categoria:
 *           type: string
 *           example: premium
 *         tarifas:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required: [tipoVehiculo, valor]
 *             properties:
 *               tipoVehiculo:
 *                 type: string
 *                 enum: [automovil, camioneta, platon_7_pasajeros, moto_hasta_150cc, moto_desde_150cc]
 *               valor:
 *                 type: integer
 *           example:
 *             - tipoVehiculo: automovil
 *               valor: 18000
 *         activo:
 *           type: boolean
 *           example: false
 */

/**
 * @swagger
 * /api/servicios:
 *   get:
 *     tags: [Servicios]
 *     summary: Listar servicios
 *     responses:
 *       200:
 *         description: Lista de servicios
 */
router.get('/', listar);

/**
 * @swagger
 * /api/servicios/{id}:
 *   get:
 *     tags: [Servicios]
 *     summary: Obtener un servicio por id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Servicio encontrado
 *       400:
 *         description: Id inválido
 *       404:
 *         description: Servicio no encontrado
 */
router.get('/:id', validarIdDeUrl, validar, obtenerPorId);

/**
 * @swagger
 * /api/servicios:
 *   post:
 *     tags: [Servicios]
 *     summary: Registrar un servicio
 *     description: >
 *       El servicio nace siempre con activo=true; el cliente no puede
 *       fijarlo en la creación.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ServicioCrear'
 *     responses:
 *       201:
 *         description: Servicio registrado correctamente
 *       400:
 *         description: Datos inválidos (incluida una tarifa repetida para el mismo tipo de vehículo)
 *       409:
 *         description: Ya existe un servicio con ese número
 */
router.post('/', validarCrear, validar, crear);

/**
 * @swagger
 * /api/servicios/{id}:
 *   put:
 *     tags: [Servicios]
 *     summary: Actualizar un servicio
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
 *             $ref: '#/components/schemas/ServicioActualizar'
 *     responses:
 *       200:
 *         description: Servicio actualizado correctamente
 *       400:
 *         description: Datos o id inválidos (incluida una tarifa repetida para el mismo tipo de vehículo)
 *       404:
 *         description: Servicio no encontrado
 *       409:
 *         description: El número ya pertenece a otro servicio
 */
router.put('/:id', validarIdDeUrl, validarActualizar, validar, actualizar);

/**
 * @swagger
 * /api/servicios/{id}:
 *   delete:
 *     tags: [Servicios]
 *     summary: Eliminar un servicio
 *     description: No se puede eliminar un servicio que tenga órdenes de lavado asociadas.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Servicio eliminado correctamente
 *       400:
 *         description: Id inválido
 *       404:
 *         description: Servicio no encontrado
 *       409:
 *         description: El servicio tiene órdenes de lavado asociadas
 */
router.delete('/:id', validarIdDeUrl, validar, eliminar);

module.exports = router;
