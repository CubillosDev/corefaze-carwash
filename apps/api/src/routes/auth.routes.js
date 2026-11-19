const { Router } = require('express');
const {
  validarRegistro,
  validarLogin,
  validarAsignacionRol,
} = require('../middlewares/auth.validator');
const { validar, validarIdDeUrl } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');
const { registrar, login, perfil, asignarRol } = require('../controllers/auth.controller');

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     RegistroUsuario:
 *       type: object
 *       required: [nombre, email, password]
 *       properties:
 *         nombre:
 *           type: string
 *           example: Colaborador Lavadero
 *         email:
 *           type: string
 *           format: email
 *           example: colaborador@lavadero.com
 *         password:
 *           type: string
 *           format: password
 *           example: ClaveSegura2026!
 *     LoginUsuario:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: colaborador@lavadero.com
 *         password:
 *           type: string
 *           format: password
 *           example: ClaveSegura2026!
 */

/**
 * @swagger
 * /api/auth/registro:
 *   post:
 *     tags:
 *       - Autenticación
 *     summary: Registrar un nuevo usuario
 *     description: >
 *       Registra un nuevo usuario utilizando bcrypt para proteger la contraseña.
 *       El rol es asignado por el servidor (siempre nace como "pendiente") y no
 *       puede ser definido por el cliente. Solo un superadmin puede asignar un
 *       rol operativo a una cuenta, a través de una operación administrativa
 *       aparte.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegistroUsuario'
 *     responses:
 *       201:
 *         description: Usuario registrado correctamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: Correo electrónico ya registrado
 */
router.post('/registro', validarRegistro, validar, registrar);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Autenticación
 *     summary: Iniciar sesión
 *     description: Verifica email y contraseña. Todavía no genera JWT (llega en el Bloque 5).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginUsuario'
 *     responses:
 *       200:
 *         description: Credenciales correctas
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Credenciales inválidas
 *       403:
 *         description: Usuario deshabilitado
 */
router.post('/login', validarLogin, validar, login);

/**
 * @swagger
 * /api/auth/perfil:
 *   get:
 *     tags:
 *       - Autenticación
 *     summary: Obtener perfil del usuario autenticado
 *     description: Requiere API Key y un JWT válido.
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario autenticado correctamente
 *       401:
 *         description: Credenciales de autenticación ausentes o inválidas
 */
router.get('/perfil', autenticarJWT, perfil);

/**
 * @swagger
 * components:
 *   schemas:
 *     AsignacionRol:
 *       type: object
 *       required: [rol]
 *       properties:
 *         rol:
 *           type: string
 *           enum: [superadmin, administrador, soporte, pendiente]
 *           example: administrador
 */

/**
 * @swagger
 * /api/auth/usuarios/{id}/rol:
 *   patch:
 *     tags:
 *       - Autenticación
 *     summary: Asignar rol a un usuario (RBAC)
 *     description: >
 *       Única forma de que un usuario deje de ser "pendiente". Operación
 *       disponible únicamente para superadmin.
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AsignacionRol'
 *     responses:
 *       200:
 *         description: Rol asignado correctamente
 *       400:
 *         description: Rol o id inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente al superadmin
 *       404:
 *         description: Usuario no encontrado
 */
router.patch(
  '/usuarios/:id/rol',
  autenticarJWT,
  autorizarRoles(ROLES_ENUM.SUPERADMIN),
  validarIdDeUrl,
  validarAsignacionRol,
  validar,
  asignarRol,
);

module.exports = router;
