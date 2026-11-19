const { Router } = require('express');
const { listar, obtenerPorId, cambiarEstado } = require('../controllers/usuarios.controller');
const { validarListar, validarCambioDeEstado } = require('../middlewares/usuarios.validator');
const { validar, validarIdDeUrl } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');

const router = Router();

// SCRUM-141: administración de cuentas. A diferencia de otros recursos
// (colaboradores, servicios...), soporte NO consulta usuarios — es
// información sobre quién tiene acceso a la propia API, no un dato
// operativo del lavadero.
const PUEDEN_CONSULTAR = autorizarRoles(ROLES_ENUM.SUPERADMIN, ROLES_ENUM.ADMINISTRADOR);
const PUEDEN_GESTIONAR = autorizarRoles(ROLES_ENUM.SUPERADMIN);

/**
 * @swagger
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         nombre:
 *           type: string
 *           example: Juan Pérez
 *         email:
 *           type: string
 *           example: juan.perez@lavadero.com
 *         rol:
 *           type: string
 *           enum: [superadmin, administrador, soporte, pendiente]
 *           example: administrador
 *         activo:
 *           type: boolean
 *           example: true
 *         creadoEn:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     tags: [Usuarios]
 *     summary: Listar usuarios, paginado y filtrable
 *     description: >
 *       Disponible para superadmin y administrador. Para ver las cuentas
 *       pendientes de aprobación, filtra por `rol=pendiente`.
 *     parameters:
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *           enum: [superadmin, administrador, soporte, pendiente]
 *       - in: query
 *         name: activo
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: busqueda
 *         description: Busca coincidencias parciales en nombre o email.
 *         schema:
 *           type: string
 *       - in: query
 *         name: pagina
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: porPagina
 *         schema:
 *           type: integer
 *           default: 20
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Página de usuarios
 *       400:
 *         description: Filtros inválidos
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar usuarios
 */
router.get('/', autenticarJWT, PUEDEN_CONSULTAR, validarListar, validar, listar);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   get:
 *     tags: [Usuarios]
 *     summary: Obtener un usuario por id
 *     description: Disponible para superadmin y administrador.
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
 *         description: Usuario encontrado
 *       400:
 *         description: Id inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar usuarios
 *       404:
 *         description: Usuario no encontrado
 */
router.get('/:id', autenticarJWT, PUEDEN_CONSULTAR, validarIdDeUrl, validar, obtenerPorId);

/**
 * @swagger
 * /api/usuarios/{id}/estado:
 *   patch:
 *     tags: [Usuarios]
 *     summary: Activar o desactivar una cuenta
 *     description: >
 *       Operación permitida únicamente a superadmin. No puede desactivarse a
 *       sí mismo, ni desactivar al último superadmin activo del sistema.
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
 *             required: [activo]
 *             properties:
 *               activo:
 *                 type: boolean
 *                 example: false
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Estado del usuario actualizado correctamente
 *       400:
 *         description: Datos o id inválidos
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin
 *       404:
 *         description: Usuario no encontrado
 *       409:
 *         description: >
 *           Intenta desactivarse a sí mismo, o dejaría el sistema sin ningún
 *           superadmin activo
 */
router.patch(
  '/:id/estado',
  autenticarJWT,
  PUEDEN_GESTIONAR,
  validarIdDeUrl,
  validarCambioDeEstado,
  validar,
  cambiarEstado,
);

module.exports = router;
