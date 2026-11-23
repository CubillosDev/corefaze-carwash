const { Router } = require('express');
const {
  listar,
  consultarPlaca,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
} = require('../controllers/vehiculos.controller');
const {
  validarCrear,
  validarActualizar,
  validarPlacaDeUrl,
  validarFiltroListar,
} = require('../middlewares/vehiculos.validator');
const { validar, validarIdDeUrl } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');

const router = Router();

// RBAC (SCRUM-139): mismo criterio que Clientes — soporte consulta, pero
// no gestiona (crear/editar/eliminar).
const PUEDEN_CONSULTAR = autorizarRoles(
  ROLES_ENUM.SUPERADMIN,
  ROLES_ENUM.ADMINISTRADOR,
  ROLES_ENUM.SOPORTE,
);
const PUEDEN_GESTIONAR = autorizarRoles(ROLES_ENUM.SUPERADMIN, ROLES_ENUM.ADMINISTRADOR);

/**
 * @swagger
 * components:
 *   schemas:
 *     VehiculoCrear:
 *       type: object
 *       required: [placa, tipoVehiculo, clienteId]
 *       properties:
 *         placa:
 *           type: string
 *           description: ABC123 (carro) o ABC12D (moto); se normaliza a mayúsculas.
 *           example: ABC123
 *         tipoVehiculo:
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
 *         tipoVehiculo:
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
 *     description: >
 *       Sin parámetros devuelve todos los vehículos (paginando por dentro, sin el tope de
 *       1.000 filas de PostgREST). Con placa, solo el vehículo de esa placa exacta (arreglo
 *       vacío si no existe).
 *     parameters:
 *       - in: query
 *         name: placa
 *         required: false
 *         schema:
 *           type: string
 *         description: Placa exacta, ABC123 (carro) o ABC12D (moto); se normaliza a mayúsculas.
 *         example: ABC123
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de vehículos
 *       400:
 *         description: La placa no tiene un formato válido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar vehículos
 */
router.get('/', autenticarJWT, PUEDEN_CONSULTAR, validarFiltroListar, validar, listar);

/**
 * @swagger
 * components:
 *   schemas:
 *     ConsultaPlaca:
 *       type: object
 *       properties:
 *         placa:
 *           type: string
 *           example: ABC123
 *         registrado:
 *           type: boolean
 *           example: true
 *         vehiculo:
 *           type: object
 *           nullable: true
 *           description: El vehículo, con la misma forma de GET /api/vehiculos/{id}; null si la placa no está registrada.
 *         dueno:
 *           type: object
 *           nullable: true
 *           description: El cliente dueño, con la misma forma de GET /api/clientes/{id}; null si la placa no está registrada.
 *         historial:
 *           type: object
 *           properties:
 *             visitas:
 *               type: integer
 *               description: Órdenes del vehículo que no están canceladas.
 *               example: 4
 *             ultimoServicio:
 *               type: object
 *               nullable: true
 *               properties:
 *                 id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *             ultimaFecha:
 *               type: string
 *               format: date
 *               nullable: true
 *             servicioHabitualId:
 *               type: integer
 *               nullable: true
 *               description: El servicio con más órdenes no canceladas; en empate, el tomado más recientemente.
 */

/**
 * @swagger
 * /api/vehiculos/consulta/{placa}:
 *   get:
 *     tags: [Vehículos]
 *     summary: Consultar una placa para la recepción (vehículo, dueño e historial)
 *     description: >
 *       Una sola llamada para la app móvil (ADR 0011). El historial se calcula en SQL, sin
 *       traer las órdenes. Una placa no registrada NO es un error: responde 200 con
 *       registrado false, vehiculo y dueno en null y el historial vacío.
 *     parameters:
 *       - in: path
 *         name: placa
 *         required: true
 *         schema:
 *           type: string
 *         description: ABC123 (carro) o ABC12D (moto); se normaliza a mayúsculas.
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Resultado de la consulta (registrada o no)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConsultaPlaca'
 *       400:
 *         description: La placa no tiene un formato válido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar vehículos
 */
router.get(
  '/consulta/:placa',
  autenticarJWT,
  PUEDEN_CONSULTAR,
  validarPlacaDeUrl,
  validar,
  consultarPlaca,
);

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
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Vehículo encontrado
 *       400:
 *         description: Id inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar vehículos
 *       404:
 *         description: Vehículo no encontrado
 */
router.get('/:id', autenticarJWT, PUEDEN_CONSULTAR, validarIdDeUrl, validar, obtenerPorId);

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
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201:
 *         description: Vehículo registrado correctamente
 *       400:
 *         description: Datos inválidos o la placa no corresponde al tipo de vehículo
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 *       404:
 *         description: El cliente indicado no existe
 *       409:
 *         description: Placa ya registrada
 */
router.post('/', autenticarJWT, PUEDEN_GESTIONAR, validarCrear, validar, crear);

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
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Vehículo actualizado correctamente
 *       400:
 *         description: Datos o id inválidos
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 *       404:
 *         description: Vehículo o cliente no encontrado
 *       409:
 *         description: Placa ya registrada por otro vehículo
 */
router.put(
  '/:id',
  autenticarJWT,
  PUEDEN_GESTIONAR,
  validarIdDeUrl,
  validarActualizar,
  validar,
  actualizar,
);

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
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Vehículo eliminado correctamente
 *       400:
 *         description: Id inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 *       404:
 *         description: Vehículo no encontrado
 *       409:
 *         description: El vehículo tiene lavados asociados
 */
router.delete('/:id', autenticarJWT, PUEDEN_GESTIONAR, validarIdDeUrl, validar, eliminar);

module.exports = router;
