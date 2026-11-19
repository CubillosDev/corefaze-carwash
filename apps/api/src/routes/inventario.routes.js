const { Router } = require('express');
const {
  listar,
  crear,
  actualizar,
  cambiarEstado,
  registrarMovimiento,
  listarMovimientos,
} = require('../controllers/inventario.controller');
const {
  validarCrear,
  validarActualizar,
  validarEstado,
  validarMovimiento,
} = require('../middlewares/inventario.validator');
const { validar, validarIdDeUrl } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');

const router = Router();

// Consultar y registrar entradas o salidas es del día a día (también
// soporte). Crear, editar o desactivar insumos es de administración.
const PUEDEN_OPERAR = autorizarRoles(
  ROLES_ENUM.SUPERADMIN,
  ROLES_ENUM.ADMINISTRADOR,
  ROLES_ENUM.SOPORTE,
);
const PUEDEN_GESTIONAR = autorizarRoles(ROLES_ENUM.SUPERADMIN, ROLES_ENUM.ADMINISTRADOR);

/**
 * @swagger
 * components:
 *   schemas:
 *     InsumoDatos:
 *       type: object
 *       required: [nombre, categoria, unidad, stockMinimo]
 *       properties:
 *         nombre: { type: string, example: Shampoo pH neutro }
 *         categoria: { type: string, example: Lavado exterior }
 *         unidad: { type: string, example: litros }
 *         stockMinimo: { type: integer, example: 10 }
 *         stockInicial: { type: integer, example: 18, description: Solo al crear; entra como primer movimiento }
 */

/**
 * @swagger
 * /api/inventario:
 *   get:
 *     tags: [Inventario]
 *     summary: Listar insumos con su stock y el aviso de stock bajo
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Insumos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *   post:
 *     tags: [Inventario]
 *     summary: Crear un insumo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/InsumoDatos' }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201: { description: Insumo creado }
 *       400: { description: Datos inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Solo superadmin o administrador }
 *       409: { description: Ya existe un insumo con ese nombre }
 */
router.get('/', autenticarJWT, PUEDEN_OPERAR, listar);
router.post('/', autenticarJWT, PUEDEN_GESTIONAR, validarCrear, validar, crear);

/**
 * @swagger
 * /api/inventario/{id}:
 *   put:
 *     tags: [Inventario]
 *     summary: Editar un insumo (el stock cambia solo con movimientos)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/InsumoDatos' }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Insumo actualizado }
 *       400: { description: Datos inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Solo superadmin o administrador }
 *       404: { description: Insumo no encontrado }
 *       409: { description: Ya existe un insumo con ese nombre }
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
 * /api/inventario/{id}/estado:
 *   patch:
 *     tags: [Inventario]
 *     summary: Activar o desactivar un insumo
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado: { type: string, enum: [activo, inactivo] }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Estado actualizado }
 *       400: { description: Datos inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Solo superadmin o administrador }
 *       404: { description: Insumo no encontrado }
 */
router.patch(
  '/:id/estado',
  autenticarJWT,
  PUEDEN_GESTIONAR,
  validarIdDeUrl,
  validarEstado,
  validar,
  cambiarEstado,
);

/**
 * @swagger
 * /api/inventario/{id}/movimientos:
 *   get:
 *     tags: [Inventario]
 *     summary: Últimos movimientos de un insumo
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200: { description: Movimientos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *       404: { description: Insumo no encontrado }
 *   post:
 *     tags: [Inventario]
 *     summary: Sumar o restar unidades a un insumo
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cantidad]
 *             properties:
 *               cantidad: { type: integer, example: -1 }
 *               observacion: { type: string, nullable: true }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201: { description: Movimiento registrado, con el insumo actualizado }
 *       400: { description: Datos inválidos }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *       404: { description: Insumo no encontrado }
 *       409: { description: El stock quedaría en negativo o el insumo está inactivo }
 */
router.get(
  '/:id/movimientos',
  autenticarJWT,
  PUEDEN_OPERAR,
  validarIdDeUrl,
  validar,
  listarMovimientos,
);
router.post(
  '/:id/movimientos',
  autenticarJWT,
  PUEDEN_OPERAR,
  validarIdDeUrl,
  validarMovimiento,
  validar,
  registrarMovimiento,
);

module.exports = router;
