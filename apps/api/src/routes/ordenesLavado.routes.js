const { Router } = require('express');
const { param } = require('express-validator');
const {
  listar,
  obtenerPorId,
  crear,
  editar,
  cambiarEstado,
} = require('../controllers/ordenesLavado.controller');
const {
  validarCrear,
  validarEditar,
  validarCambioDeEstado,
  validarFiltroListar,
} = require('../middlewares/ordenesLavado.validator');
const { validar } = require('../middlewares/validar.middleware');

const router = Router();

const validarIdDeUrl = [
  param('id').isInt({ min: 1 }).withMessage('El id debe ser un entero positivo').toInt(),
];

/**
 * @swagger
 * components:
 *   schemas:
 *     OrdenCrear:
 *       type: object
 *       required: [turno, vehiculoId, servicioId, colaboradorId, medioPago]
 *       properties:
 *         turno:
 *           type: integer
 *           example: 1
 *         vehiculoId:
 *           type: integer
 *           example: 1
 *         servicioId:
 *           type: integer
 *           example: 1
 *         colaboradorId:
 *           type: integer
 *           example: 1
 *         medioPago:
 *           type: string
 *           enum: [efectivo, nequi, daviplata, bancolombia, datafono, credito]
 *           example: efectivo
 *         clienteId:
 *           type: integer
 *           description: Obligatorio solo si medioPago es "credito"; en cualquier otro caso se ignora.
 *           example: 1
 *         autorizaMotor:
 *           type: boolean
 *           description: Obligatorio en true si el servicio exige autorización para lavado de motor.
 *           example: false
 *         observaciones:
 *           type: string
 *           example: Rayón leve en la puerta derecha
 *       description: >
 *         "fecha" no forma parte de este contrato: la fija la jornada
 *         abierta en el momento de crear la orden, nunca el cliente (si
 *         no hay ninguna jornada abierta, no se puede crear). "valor" y
 *         "estado" tampoco: el servidor siempre calcula el valor desde la
 *         tarifa del servicio y toda orden nueva nace en estado "registrada".
 *     OrdenEditar:
 *       type: object
 *       properties:
 *         vehiculoId:
 *           type: integer
 *           example: 2
 *         colaboradorId:
 *           type: integer
 *           example: 2
 *         medioPago:
 *           type: string
 *           enum: [efectivo, nequi, daviplata, bancolombia, datafono, credito]
 *           example: nequi
 *         clienteId:
 *           type: integer
 *           example: 1
 *         observaciones:
 *           type: string
 *           example: Cliente pidió encerado adicional
 *       description: >
 *         Solo campos no financieros. "servicioId", "valor", "estado",
 *         "fecha" y "jornadaId" no son editables: si se envían, se
 *         ignoran. "valor" es inmutable desde la creación de la orden y
 *         nunca se recalcula al editar, aunque cambie la tarifa del
 *         servicio o el tipo de vehículo.
 */

/**
 * @swagger
 * /api/ordenes-lavado:
 *   get:
 *     tags: [Órdenes de lavado]
 *     summary: Listar órdenes de lavado
 *     parameters:
 *       - in: query
 *         name: fecha
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtra las órdenes por fecha exacta (ISO 8601).
 *       - in: query
 *         name: colaboradorId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra las órdenes de ese colaborador.
 *       - in: query
 *         name: servicioId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra las órdenes de ese servicio.
 *       - in: query
 *         name: medioPago
 *         required: false
 *         schema:
 *           type: string
 *           enum: [efectivo, nequi, daviplata, bancolombia, datafono, credito]
 *         description: Filtra las órdenes con ese medio de pago.
 *       - in: query
 *         name: jornadaId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra las órdenes de esa jornada.
 *     responses:
 *       200:
 *         description: >
 *           Lista de órdenes de lavado (todos los filtros son combinables
 *           con AND), junto con sus totales. Los totales se calculan
 *           siempre sobre el mismo conjunto ya filtrado que se devuelve en
 *           "ordenes", y las órdenes canceladas nunca suman.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ordenes:
 *                   type: array
 *                   items:
 *                     type: object
 *                 totales:
 *                   type: object
 *                   properties:
 *                     cantidadServicios:
 *                       type: integer
 *                       example: 3
 *                     totalGeneral:
 *                       type: integer
 *                       example: 45000
 *                     totalesPorMedioPago:
 *                       type: object
 *                       description: Una clave por cada medio de pago del dominio, en 0 si no se usó.
 *                       example:
 *                         efectivo: 15000
 *                         nequi: 0
 *                         daviplata: 0
 *                         bancolombia: 0
 *                         datafono: 0
 *                         credito: 30000
 *       400:
 *         description: Algún filtro tiene formato inválido
 */
router.get('/', validarFiltroListar, validar, listar);

/**
 * @swagger
 * /api/ordenes-lavado/{id}:
 *   get:
 *     tags: [Órdenes de lavado]
 *     summary: Obtener una orden de lavado por id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden de lavado encontrada
 *       400:
 *         description: Id inválido
 *       404:
 *         description: Orden de lavado no encontrada
 */
router.get('/:id', validarIdDeUrl, validar, obtenerPorId);

/**
 * @swagger
 * /api/ordenes-lavado:
 *   post:
 *     tags: [Órdenes de lavado]
 *     summary: Registrar una orden de lavado
 *     description: >
 *       Una orden es un registro auditable. Siempre queda amarrada a la
 *       jornada que está abierta en el momento de crearla, y su fecha es
 *       la de esa jornada. El valor nace siempre de la tarifa del
 *       servicio para el tipo de vehículo, nunca del cliente de la API.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrdenCrear'
 *     responses:
 *       201:
 *         description: Orden de lavado registrada correctamente
 *       400:
 *         description: Datos inválidos
 *       404:
 *         description: El vehículo, servicio, colaborador o cliente indicado no existe
 *       409:
 *         description: >
 *           Viola alguna regla de negocio (no hay jornada abierta,
 *           colaborador inactivo, servicio inactivo o sin tarifa para el
 *           tipo de vehículo, lavado de motor sin autorización, cliente
 *           sin crédito habilitado, turno ya ocupado para esa fecha, o el
 *           vehículo ya tiene una orden abierta)
 */
router.post('/', validarCrear, validar, crear);

/**
 * @swagger
 * /api/ordenes-lavado/{id}:
 *   patch:
 *     tags: [Órdenes de lavado]
 *     summary: Editar los campos no financieros de una orden abierta
 *     description: >
 *       Solo mientras la orden no esté cerrada (entregada/cancelada) y su
 *       jornada siga abierta. Revalida colaborador activo, vehículo sin
 *       otra orden abierta y crédito habilitado solo sobre los campos que
 *       cambien. "valor" es inmutable desde la creación: nunca se
 *       recalcula aquí, así que editar no puede rechazar por "servicio
 *       inactivo" (esa regla solo aplica al crear).
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
 *             $ref: '#/components/schemas/OrdenEditar'
 *     responses:
 *       200:
 *         description: Orden de lavado actualizada correctamente
 *       400:
 *         description: Datos o id inválidos
 *       404:
 *         description: Orden, vehículo, colaborador o cliente no encontrado
 *       409:
 *         description: >
 *           La orden está cerrada, su jornada ya no está abierta, el
 *           colaborador nuevo está inactivo, el vehículo nuevo ya tiene
 *           otra orden abierta, o el cliente no tiene crédito habilitado
 */
router.patch('/:id', validarIdDeUrl, validarEditar, validar, editar);

/**
 * @swagger
 * /api/ordenes-lavado/{id}/estado:
 *   patch:
 *     tags: [Órdenes de lavado]
 *     summary: Cambiar el estado de una orden de lavado
 *     description: >
 *       Sigue la máquina de estados del dominio: una orden entregada o
 *       cancelada no puede volver a cambiar de estado, y no se pueden
 *       saltar ni retroceder estados. Cancelar exige un "motivo"; para
 *       cualquier otro estado, "motivo" se ignora.
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
 *                 enum: [registrada, en_proceso, terminada, entregada, cancelada]
 *                 example: en_proceso
 *               motivo:
 *                 type: string
 *                 description: Obligatorio cuando estado es "cancelada"; se ignora en cualquier otro caso.
 *                 example: El cliente no llegó
 *     responses:
 *       200:
 *         description: Estado de la orden actualizado correctamente
 *       400:
 *         description: Estado o id inválidos, o falta el motivo al cancelar
 *       404:
 *         description: Orden de lavado no encontrada
 *       409:
 *         description: La orden ya está cerrada, o la transición de estado no es válida
 */
router.patch('/:id/estado', validarIdDeUrl, validarCambioDeEstado, validar, cambiarEstado);

module.exports = router;
