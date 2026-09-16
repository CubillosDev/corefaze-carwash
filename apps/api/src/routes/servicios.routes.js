const { Router } = require("express");
const validar = require("../middlewares/validar.middleware");
const serviciosValidator = require("../middlewares/servicios.validator");
const serviciosController = require("../controllers/servicios.controller");

const router = Router();

/**
 * @openapi
 * /servicios:
 *   get:
 *     summary: Listar servicios del catalogo
 *     tags: [Servicios]
 *     parameters:
 *       - in: query
 *         name: activo
 *         schema: { type: boolean }
 *     responses:
 *       200: { description: Lista de servicios, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Servicio' } } } } }
 *   post:
 *     summary: Crear un servicio
 *     tags: [Servicios]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Servicio' } } }
 *     responses:
 *       201: { description: Servicio creado, content: { application/json: { schema: { $ref: '#/components/schemas/Servicio' } } } }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 */
router.get("/", serviciosValidator.filtrosListado, validar, serviciosController.listarServicios);
router.post("/", serviciosValidator.crear, validar, serviciosController.crearServicio);

/**
 * @openapi
 * /servicios/{id}:
 *   get:
 *     summary: Obtener un servicio por id
 *     tags: [Servicios]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Servicio encontrado }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *   put:
 *     summary: Actualizar un servicio
 *     tags: [Servicios]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Servicio' } } }
 *     responses:
 *       200: { description: Servicio actualizado }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 *   delete:
 *     summary: Eliminar un servicio
 *     description: 409 si el servicio tiene ordenes de lavado asociadas.
 *     tags: [Servicios]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Servicio eliminado }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 */
router.get("/:id", serviciosValidator.idValido, validar, serviciosController.obtenerServicio);
router.put("/:id", [...serviciosValidator.idValido, ...serviciosValidator.actualizar], validar, serviciosController.actualizarServicio);
router.delete("/:id", serviciosValidator.idValido, validar, serviciosController.eliminarServicio);

module.exports = router;