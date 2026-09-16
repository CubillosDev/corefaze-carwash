const { Router } = require("express");
const validar = require("../middlewares/validar.middleware");
const vehiculosValidator = require("../middlewares/vehiculos.validator");
const vehiculosController = require("../controllers/vehiculos.controller");

const router = Router();

/**
 * @openapi
 * /vehiculos:
 *   get:
 *     summary: Listar vehiculos (filtrable por placa)
 *     tags: [Vehiculos]
 *     parameters:
 *       - in: query
 *         name: placa
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de vehiculos
 *         content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Vehiculo' } } } }
 *   post:
 *     summary: Crear un vehiculo
 *     tags: [Vehiculos]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Vehiculo' } } }
 *     responses:
 *       201: { description: Vehiculo creado, content: { application/json: { schema: { $ref: '#/components/schemas/Vehiculo' } } } }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 */
router.get("/", vehiculosValidator.filtrosListado, validar, vehiculosController.listarVehiculos);
router.post("/", vehiculosValidator.crear, validar, vehiculosController.crearVehiculo);

/**
 * @openapi
 * /vehiculos/{id}:
 *   get:
 *     summary: Obtener un vehiculo por id
 *     tags: [Vehiculos]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Vehiculo encontrado }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *   put:
 *     summary: Actualizar un vehiculo
 *     tags: [Vehiculos]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Vehiculo' } } }
 *     responses:
 *       200: { description: Vehiculo actualizado }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 *   delete:
 *     summary: Eliminar un vehiculo
 *     description: 409 si el vehiculo tiene ordenes de lavado asociadas.
 *     tags: [Vehiculos]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Vehiculo eliminado }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 */
router.get("/:id", vehiculosValidator.idValido, validar, vehiculosController.obtenerVehiculo);
router.put("/:id", [...vehiculosValidator.idValido, ...vehiculosValidator.actualizar], validar, vehiculosController.actualizarVehiculo);
router.delete("/:id", vehiculosValidator.idValido, validar, vehiculosController.eliminarVehiculo);

module.exports = router;