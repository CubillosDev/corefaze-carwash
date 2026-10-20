const { Router } = require('express');
const {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
} = require('../controllers/clientes.controller');
const { validarCrear, validarActualizar } = require('../middlewares/clientes.validator');
const { validar, validarIdDeUrl } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');

const router = Router();

// RBAC (SCRUM-139): soporte necesita consultar clientes para registrar
// órdenes, pero no gestionarlos (crear/editar/eliminar).
const PUEDEN_CONSULTAR = autorizarRoles('superadmin', 'administrador', 'soporte');
const PUEDEN_GESTIONAR = autorizarRoles('superadmin', 'administrador');

/**
 * @swagger
 * components:
 *   schemas:
 *     ClienteCrear:
 *       type: object
 *       required: [nombre, documento, tipo, telefono]
 *       properties:
 *         nombre:
 *           type: string
 *           example: Ana María Torres
 *         documento:
 *           type: string
 *           example: "1010101010"
 *         tipo:
 *           type: string
 *           enum: [particular, empresa]
 *           example: particular
 *         telefono:
 *           type: string
 *           example: "3001234567"
 *         email:
 *           type: string
 *           format: email
 *           example: ana@correo.com
 *         creditoHabilitado:
 *           type: boolean
 *           description: Solo puede ser true si tipo es "empresa"; el servidor lo fuerza a false para particulares.
 *           example: false
 *     ClienteActualizar:
 *       type: object
 *       properties:
 *         nombre:
 *           type: string
 *         documento:
 *           type: string
 *         tipo:
 *           type: string
 *           enum: [particular, empresa]
 *         telefono:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         creditoHabilitado:
 *           type: boolean
 *         estado:
 *           type: string
 *           enum: [activo, inactivo]
 */

/**
 * @swagger
 * /api/clientes:
 *   get:
 *     tags: [Clientes]
 *     summary: Listar clientes
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de clientes
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar clientes
 */
router.get('/', autenticarJWT, PUEDEN_CONSULTAR, listar);

/**
 * @swagger
 * /api/clientes/{id}:
 *   get:
 *     tags: [Clientes]
 *     summary: Obtener un cliente por id
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
 *         description: Cliente encontrado
 *       400:
 *         description: Id inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar clientes
 *       404:
 *         description: Cliente no encontrado
 */
router.get('/:id', autenticarJWT, PUEDEN_CONSULTAR, validarIdDeUrl, validar, obtenerPorId);

/**
 * @swagger
 * /api/clientes:
 *   post:
 *     tags: [Clientes]
 *     summary: Registrar un cliente
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ClienteCrear'
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201:
 *         description: Cliente registrado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 *       409:
 *         description: Documento ya registrado
 */
router.post('/', autenticarJWT, PUEDEN_GESTIONAR, validarCrear, validar, crear);

/**
 * @swagger
 * /api/clientes/{id}:
 *   put:
 *     tags: [Clientes]
 *     summary: Actualizar un cliente
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
 *             $ref: '#/components/schemas/ClienteActualizar'
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Cliente actualizado correctamente
 *       400:
 *         description: Datos o id inválidos
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 *       404:
 *         description: Cliente no encontrado
 *       409:
 *         description: Documento ya registrado por otro cliente
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
 * /api/clientes/{id}:
 *   delete:
 *     tags: [Clientes]
 *     summary: Eliminar un cliente
 *     description: No se puede eliminar un cliente que tenga vehículos asociados.
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
 *         description: Cliente eliminado correctamente
 *       400:
 *         description: Id inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 *       404:
 *         description: Cliente no encontrado
 *       409:
 *         description: El cliente tiene vehículos asociados
 */
router.delete('/:id', autenticarJWT, PUEDEN_GESTIONAR, validarIdDeUrl, validar, eliminar);

module.exports = router;
