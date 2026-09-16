const { Router } = require("express");
const validar = require("../middlewares/validar.middleware");
const colaboradoresValidator = require("../middlewares/colaboradores.validator");
const colaboradoresController = require("../controllers/colaboradores.controller");

const router = Router();

/**
 * @openapi
 * /colaboradores:
 *   get:
 *     summary: Listar colaboradores
 *     tags: [Colaboradores]
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema: { type: string, enum: [activo, inactivo] }
 *     responses:
 *       200: { description: Lista de colaboradores, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Colaborador' } } } } }
 *   post:
 *     summary: Crear un colaborador
 *     tags: [Colaboradores]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Colaborador' } } }
 *     responses:
 *       201: { description: Colaborador creado, content: { application/json: { schema: { $ref: '#/components/schemas/Colaborador' } } } }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 */
router.get("/", colaboradoresValidator.filtrosListado, validar, colaboradoresController.listarColaboradores);
router.post("/", colaboradoresValidator.crear, validar, colaboradoresController.crearColaborador);

/**
 * @openapi
 * /colaboradores/{id}:
 *   get:
 *     summary: Obtener un colaborador por id
 *     tags: [Colaboradores]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Colaborador encontrado }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *   put:
 *     summary: Actualizar un colaborador
 *     tags: [Colaboradores]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Colaborador' } } }
 *     responses:
 *       200: { description: Colaborador actualizado }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 *   delete:
 *     summary: Eliminar un colaborador
 *     description: 409 si el colaborador tiene ordenes de lavado asociadas.
 *     tags: [Colaboradores]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Colaborador eliminado }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 */
router.get("/:id", colaboradoresValidator.idValido, validar, colaboradoresController.obtenerColaborador);
router.put("/:id", [...colaboradoresValidator.idValido, ...colaboradoresValidator.actualizar], validar, colaboradoresController.actualizarColaborador);
router.delete("/:id", colaboradoresValidator.idValido, validar, colaboradoresController.eliminarColaborador);

/**
 * @openapi
 * /colaboradores/{id}/estado:
 *   patch:
 *     summary: Cambiar el estado (activo/inactivo) de un colaborador
 *     tags: [Colaboradores]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { type: object, properties: { estado: { type: string, enum: [activo, inactivo] } } } } }
 *     responses:
 *       200: { description: Estado actualizado }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 */
router.patch("/:id/estado", [...colaboradoresValidator.idValido, ...colaboradoresValidator.cambiarEstado], validar, colaboradoresController.cambiarEstadoColaborador);

/**
 * @openapi
 * /colaboradores/{id}/ordenes:
 *   get:
 *     summary: Liquidacion del dia (ordenes y comision sobre lo entregado)
 *     tags: [Colaboradores]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: fecha
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Ordenes del colaborador y total de comision }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 */
router.get("/:id/ordenes", [...colaboradoresValidator.idValido, ...colaboradoresValidator.filtrosOrdenes], validar, colaboradoresController.obtenerLiquidacion);

module.exports = router;