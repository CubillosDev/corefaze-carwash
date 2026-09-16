const { Router } = require("express");
const validar = require("../middlewares/validar.middleware");
const ordenesValidator = require("../middlewares/ordenesLavado.validator");
const ordenesController = require("../controllers/ordenesLavado.controller");

const router = Router();

/**
 * @openapi
 * /ordenes-lavado:
 *   get:
 *     summary: Listar ordenes de lavado (filtrable por fecha)
 *     tags: [OrdenesLavado]
 *     parameters:
 *       - in: query
 *         name: fecha
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Lista de ordenes, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/OrdenLavado' } } } } }
 *   post:
 *     summary: Registrar una orden de lavado
 *     description: >
 *       El valor lo calcula el servidor a partir de la tarifa vigente del
 *       servicio para el tipo de vehiculo (R4); cualquier valor enviado por
 *       el cliente se descarta.
 *     tags: [OrdenesLavado]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/OrdenLavado' } } }
 *     responses:
 *       201: { description: Orden creada, content: { application/json: { schema: { $ref: '#/components/schemas/OrdenLavado' } } } }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 */
router.get("/", ordenesValidator.filtrosListado, validar, ordenesController.listarOrdenes);
router.post("/", ordenesValidator.crear, validar, ordenesController.crearOrden);

/**
 * @openapi
 * /ordenes-lavado/{id}:
 *   get:
 *     summary: Obtener una orden de lavado por id
 *     tags: [OrdenesLavado]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Orden encontrada }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *   put:
 *     summary: Actualizar una orden de lavado
 *     description: 409 si la orden ya esta entregada o cancelada (R10).
 *     tags: [OrdenesLavado]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/OrdenLavado' } } }
 *     responses:
 *       200: { description: Orden actualizada }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 *   delete:
 *     summary: Eliminar una orden de lavado
 *     description: 409 si la orden ya esta entregada o cancelada (R10).
 *     tags: [OrdenesLavado]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Orden eliminada }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 */
router.get("/:id", ordenesValidator.idValido, validar, ordenesController.obtenerOrden);
router.put("/:id", [...ordenesValidator.idValido, ...ordenesValidator.actualizar], validar, ordenesController.actualizarOrden);
router.delete("/:id", ordenesValidator.idValido, validar, ordenesController.eliminarOrden);

/**
 * @openapi
 * /ordenes-lavado/{id}/estado:
 *   patch:
 *     summary: Cambiar el estado de una orden (maquina de estados, R9)
 *     tags: [OrdenesLavado]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado: { type: string, enum: [registrada, en_proceso, terminada, entregada, cancelada] }
 *     responses:
 *       200: { description: Estado actualizado }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 */
router.patch("/:id/estado", [...ordenesValidator.idValido, ...ordenesValidator.cambiarEstado], validar, ordenesController.cambiarEstadoOrden);

module.exports = router;