const { Router } = require('express');
const { registrar, login } = require('../controllers/auth.controller');
const { validarRegistro, validarLogin } = require('../middlewares/auth.validator');
const { validar } = require('../middlewares/validar.middleware');

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

module.exports = router;
