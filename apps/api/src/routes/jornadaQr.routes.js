const { Router } = require('express');
const { body } = require('express-validator');
const { generar, canjear } = require('../controllers/jornadaQr.controller');
const { validar } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');

const router = Router();

// Los mismos roles que abren la jornada con POST /api/jornadas.
const PUEDEN_ABRIR = autorizarRoles(
  ROLES_ENUM.SUPERADMIN,
  ROLES_ENUM.ADMINISTRADOR,
  ROLES_ENUM.SOPORTE,
);

const validarCanje = [
  body('contenido')
    .isString()
    .withMessage('contenido es obligatorio')
    .bail()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('contenido no es un código QR de jornada'),
];

/**
 * @swagger
 * /api/jornadas/qr:
 *   post:
 *     tags: [Jornadas]
 *     summary: Generar el QR para abrir la jornada desde la app móvil
 *     description: >
 *       Devuelve el contenido del QR (corefaze-jornada:<token>), de un solo
 *       uso y con vigencia de 30 segundos. Solo se guarda el SHA-256 del token.
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201: { description: QR generado }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 */
router.post('/', autenticarJWT, PUEDEN_ABRIR, generar);

/**
 * @swagger
 * /api/jornadas/qr/canje:
 *   post:
 *     tags: [Jornadas]
 *     summary: Abrir la jornada con el QR leído desde la app móvil
 *     description: >
 *       Lo llama la app móvil con la sesión de quien lee el QR. Marca el
 *       token como usado y abre la jornada del día a nombre de ese usuario.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contenido]
 *             properties:
 *               contenido: { type: string, example: 'corefaze-jornada:...' }
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201: { description: Jornada abierta }
 *       400: { description: Contenido inválido }
 *       401: { description: Usuario no autenticado }
 *       403: { description: Rol sin permiso }
 *       409: { description: El QR venció o ya se usó, o ya hay una jornada abierta o registrada hoy }
 */
router.post('/canje', autenticarJWT, PUEDEN_ABRIR, validarCanje, validar, canjear);

module.exports = router;
