const { Router } = require('express');
const { obtener, actualizar } = require('../controllers/parametros.controller');
const { validarActualizar } = require('../middlewares/parametros.validator');
const { validar } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');

const router = Router();

// RBAC (SCRUM-139): consultar los parámetros sigue la misma base que el
// resto de la API (todo autenticado salvo "pendiente"); actualizarlos
// queda reservado a superadmin — son costos y comisión del negocio.
const PUEDEN_CONSULTAR = autorizarRoles(
  ROLES_ENUM.SUPERADMIN,
  ROLES_ENUM.ADMINISTRADOR,
  ROLES_ENUM.SOPORTE,
);
const PUEDEN_ACTUALIZAR = autorizarRoles(ROLES_ENUM.SUPERADMIN);

/**
 * @swagger
 * components:
 *   schemas:
 *     ParametrosActualizar:
 *       type: object
 *       properties:
 *         nombreNegocio:
 *           type: string
 *           example: Car Wash
 *         nit:
 *           type: string
 *           example: '900123456'
 *         direccion:
 *           type: string
 *           example: Calle 10 # 20-30
 *         telefono:
 *           type: string
 *           example: '3001234567'
 *         porcentajeComision:
 *           type: number
 *           example: 0.37
 *         comisionVigenteDesde:
 *           type: string
 *           format: date
 *           example: '2026-01-01'
 *         descontarComisionDiaria:
 *           type: boolean
 *           example: false
 *         costoArriendo:
 *           type: integer
 *           example: 2000000
 *         costoLuz:
 *           type: integer
 *           example: 300000
 *         costoAgua:
 *           type: integer
 *           example: 200000
 *         costoNominaFija:
 *           type: integer
 *           example: 5000000
 *         costoDepreciacion:
 *           type: integer
 *           example: 150000
 *         costoInsumos:
 *           type: integer
 *           example: 400000
 *         costoVariableLavado:
 *           type: integer
 *           example: 8000
 *         precioPromedioReferencia:
 *           type: integer
 *           example: 25000
 *         topePrestamoColaborador:
 *           type: integer
 *           example: 100000
 *         diasOperacionMes:
 *           type: integer
 *           example: 30
 *       description: >
 *         Todos los campos son opcionales: solo se actualiza lo que se
 *         envíe. "id" y "actualizadoPor" no forman parte del contrato: el
 *         servidor los controla por completo (id es siempre 1,
 *         actualizadoPor sale del usuario autenticado).
 */

/**
 * @swagger
 * /api/parametros:
 *   get:
 *     tags: [Parámetros de negocio]
 *     summary: Obtener los parámetros de negocio
 *     description: >
 *       Fila única (comisión vigente, costos fijos y variables, tope de
 *       préstamo a colaboradores, etc.), creada por su propia migración:
 *       este endpoint nunca debería dar 404.
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Parámetros de negocio
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para consultar los parámetros de negocio
 */
router.get('/', autenticarJWT, PUEDEN_CONSULTAR, obtener);

/**
 * @swagger
 * /api/parametros:
 *   patch:
 *     tags: [Parámetros de negocio]
 *     summary: Actualizar los parámetros de negocio
 *     description: Restringido a superadmin.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ParametrosActualizar'
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Parámetros de negocio actualizados correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Rol sin permiso para actualizar los parámetros de negocio (solo superadmin)
 */
router.patch('/', autenticarJWT, PUEDEN_ACTUALIZAR, validarActualizar, validar, actualizar);

module.exports = router;
