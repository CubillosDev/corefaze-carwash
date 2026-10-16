const { Router } = require('express');
const { param, body } = require('express-validator');
const {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  cambiarEstado,
  eliminar,
} = require('../controllers/colaboradores.controller');
const { validarCrear, validarActualizar } = require('../middlewares/colaboradores.validator');
const { validar } = require('../middlewares/validar.middleware');
const { ESTADOS_ACTIVIDAD } = require('../constants/dominio');

const router = Router();

const validarIdDeUrl = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

const validarCambioDeEstado = [
  body('estado')
    .isIn(Object.values(ESTADOS_ACTIVIDAD))
    .withMessage(`El estado debe ser uno de: ${Object.values(ESTADOS_ACTIVIDAD).join(', ')}`),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     ColaboradorCrear:
 *       type: object
 *       required: [codigo, nombre, documento, telefono, porcentajeComision, tipoVinculacion]
 *       properties:
 *         codigo:
 *           type: integer
 *           description: Código numérico de exactamente 3 dígitos (100 a 999).
 *           example: 401
 *         nombre:
 *           type: string
 *           example: Juan Pérez
 *         documento:
 *           type: string
 *           example: '1020304050'
 *         telefono:
 *           type: string
 *           example: '3001234567'
 *         porcentajeComision:
 *           type: number
 *           description: Valor entre 0 y 1 (0.15 = 15%).
 *           example: 0.15
 *         tipoVinculacion:
 *           type: string
 *           enum: [fijo, ocasional]
 *           example: fijo
 *     ColaboradorActualizar:
 *       type: object
 *       properties:
 *         codigo:
 *           type: integer
 *           example: 402
 *         nombre:
 *           type: string
 *           example: Juan Pérez
 *         documento:
 *           type: string
 *           example: '1020304050'
 *         telefono:
 *           type: string
 *           example: '3009999999'
 *         porcentajeComision:
 *           type: number
 *           example: 0.2
 *         tipoVinculacion:
 *           type: string
 *           enum: [fijo, ocasional]
 *           example: ocasional
 */

/**
 * @swagger
 * /api/colaboradores:
 *   get:
 *     tags: [Colaboradores]
 *     summary: Listar colaboradores
 *     responses:
 *       200:
 *         description: Lista de colaboradores
 */
router.get('/', listar);

/**
 * @swagger
 * /api/colaboradores/{id}:
 *   get:
 *     tags: [Colaboradores]
 *     summary: Obtener un colaborador por id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Colaborador encontrado
 *       400:
 *         description: Id inválido
 *       404:
 *         description: Colaborador no encontrado
 */
router.get('/:id', validarIdDeUrl, validar, obtenerPorId);

/**
 * @swagger
 * /api/colaboradores:
 *   post:
 *     tags: [Colaboradores]
 *     summary: Registrar un colaborador
 *     description: >
 *       El colaborador nace siempre con estado "activo"; el cliente no puede
 *       fijarlo en la creación.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ColaboradorCrear'
 *     responses:
 *       201:
 *         description: Colaborador registrado correctamente
 *       400:
 *         description: Datos inválidos
 *       409:
 *         description: El código o el documento ya pertenecen a otro colaborador
 */
router.post('/', validarCrear, validar, crear);

/**
 * @swagger
 * /api/colaboradores/{id}:
 *   put:
 *     tags: [Colaboradores]
 *     summary: Actualizar un colaborador
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
 *             $ref: '#/components/schemas/ColaboradorActualizar'
 *     responses:
 *       200:
 *         description: Colaborador actualizado correctamente
 *       400:
 *         description: Datos o id inválidos
 *       404:
 *         description: Colaborador no encontrado
 *       409:
 *         description: El código o el documento ya pertenecen a otro colaborador
 */
router.put('/:id', validarIdDeUrl, validarActualizar, validar, actualizar);

/**
 * @swagger
 * /api/colaboradores/{id}/estado:
 *   patch:
 *     tags: [Colaboradores]
 *     summary: Cambiar el estado de un colaborador (activo/inactivo)
 *     description: >
 *       Al pasar a "inactivo" arranca el período de gracia de
 *       DIAS_GRACIA_CODIGO_COLABORADOR días durante el cual su código sigue
 *       reservado.
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
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [activo, inactivo]
 *                 example: inactivo
 *     responses:
 *       200:
 *         description: Estado del colaborador actualizado correctamente
 *       400:
 *         description: Estado o id inválidos
 *       404:
 *         description: Colaborador no encontrado
 */
router.patch('/:id/estado', validarIdDeUrl, validarCambioDeEstado, validar, cambiarEstado);

/**
 * @swagger
 * /api/colaboradores/{id}:
 *   delete:
 *     tags: [Colaboradores]
 *     summary: Eliminar un colaborador
 *     description: No se puede eliminar un colaborador que tenga órdenes de lavado asociadas.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Colaborador eliminado correctamente
 *       400:
 *         description: Id inválido
 *       404:
 *         description: Colaborador no encontrado
 *       409:
 *         description: El colaborador tiene órdenes de lavado asociadas
 */
router.delete('/:id', validarIdDeUrl, validar, eliminar);

module.exports = router;
