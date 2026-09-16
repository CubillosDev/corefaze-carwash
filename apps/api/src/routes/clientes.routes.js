const { Router } = require("express");
const validar = require("../middlewares/validar.middleware");
const clientesValidator = require("../middlewares/clientes.validator");
const clientesController = require("../controllers/clientes.controller");

const router = Router();

/**
 * @openapi
 * /clientes:
 *   get:
 *     summary: Listar clientes
 *     tags: [Clientes]
 *     parameters:
 *       - in: query
 *         name: estado
 *         schema: { type: string, enum: [activo, inactivo] }
 *     responses:
 *       200:
 *         description: Lista de clientes
 *         content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Cliente' } } } }
 *   post:
 *     summary: Crear un cliente
 *     tags: [Clientes]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Cliente' } } }
 *     responses:
 *       201: { description: Cliente creado, content: { application/json: { schema: { $ref: '#/components/schemas/Cliente' } } } }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 */
router.get("/", clientesValidator.filtrosListado, validar, clientesController.listarClientes);
router.post("/", clientesValidator.crear, validar, clientesController.crearCliente);

/**
 * @openapi
 * /clientes/{id}:
 *   get:
 *     summary: Obtener un cliente por id
 *     tags: [Clientes]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Cliente encontrado, content: { application/json: { schema: { $ref: '#/components/schemas/Cliente' } } } }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *   put:
 *     summary: Actualizar un cliente
 *     tags: [Clientes]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content: { application/json: { schema: { $ref: '#/components/schemas/Cliente' } } }
 *     responses:
 *       200: { description: Cliente actualizado }
 *       400: { $ref: '#/components/responses/DatosInvalidos' }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 *   delete:
 *     summary: Eliminar un cliente
 *     description: 409 si el cliente tiene vehiculos u ordenes a credito asociadas.
 *     tags: [Clientes]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Cliente eliminado }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 *       409: { $ref: '#/components/responses/Conflicto' }
 */
router.get("/:id", clientesValidator.idValido, validar, clientesController.obtenerCliente);
router.put("/:id", [...clientesValidator.idValido, ...clientesValidator.actualizar], validar, clientesController.actualizarCliente);
router.delete("/:id", clientesValidator.idValido, validar, clientesController.eliminarCliente);

/**
 * @openapi
 * /clientes/{id}/ordenes:
 *   get:
 *     summary: Cuentas por cobrar del cliente (ordenes a credito)
 *     tags: [Clientes]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses:
 *       200: { description: Ordenes a credito del cliente y su total }
 *       404: { $ref: '#/components/responses/NoEncontrado' }
 */
router.get("/:id/ordenes", clientesValidator.idValido, validar, clientesController.obtenerCuentasPorCobrar);

module.exports = router;