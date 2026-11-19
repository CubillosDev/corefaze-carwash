const { Router } = require('express');
const {
  obtenerResumenQuincena,
  listarDescuentosDeColaborador,
  registrarDescuento,
  liquidarQuincena,
  listarLiquidaciones,
  obtenerLiquidacionPorId,
} = require('../controllers/nomina.controller');
const {
  validarResumenQuincena,
  validarDescuentosDeColaborador,
  validarRegistrarDescuento,
  validarLiquidarQuincena,
  validarFiltroListarLiquidaciones,
} = require('../middlewares/nomina.validator');
const { validar, validarIdDeUrl } = require('../middlewares/validar.middleware');
const { autenticarJWT } = require('../middlewares/auth.middleware');
const { autorizarRoles } = require('../middlewares/roles.middleware');
const { ROLES_ENUM } = require('../constants/dominio');

const router = Router();

// RBAC (SCRUM-161): a diferencia de crédito, TODA la nómina (consultar y
// escribir) queda reservada a superadmin/administrador — soporte no
// entra, es información de nómina/salario de los colaboradores, más
// sensible que un saldo de cliente. Las políticas RLS ya mergeadas
// (agregar_nomina_quincenal.sql) sí permiten soporte en SELECT directo;
// eso no contradice esto, la API es libre de ser más restrictiva que RLS
// (RLS es el piso de acceso directo a la BD, no el techo de la API).
const PUEDEN_NOMINA = autorizarRoles(ROLES_ENUM.SUPERADMIN, ROLES_ENUM.ADMINISTRADOR);

/**
 * @swagger
 * components:
 *   schemas:
 *     DescuentoColaboradorRegistrar:
 *       type: object
 *       required: [colaboradorId, tipo, valor, fecha]
 *       properties:
 *         colaboradorId:
 *           type: integer
 *           example: 1
 *         tipo:
 *           type: string
 *           enum: [prestamo, jabon, multa, cxc]
 *         valor:
 *           type: integer
 *           example: 50000
 *         fecha:
 *           type: string
 *           format: date
 *           example: '2026-01-10'
 *         observacion:
 *           type: string
 *           example: 'Préstamo para imprevisto familiar'
 *     QuincenaLiquidar:
 *       type: object
 *       required: [inicio, fin]
 *       properties:
 *         inicio:
 *           type: string
 *           format: date
 *           example: '2026-01-01'
 *         fin:
 *           type: string
 *           format: date
 *           example: '2026-01-15'
 */

/**
 * @swagger
 * /api/nomina/quincenas/resumen:
 *   get:
 *     tags: [Nómina]
 *     summary: Resumen proyectado de una quincena (comisión, descuentos por tipo, neto, saldo pendiente)
 *     description: >
 *       Por cada colaborador activo con alguna actividad en el periodo
 *       (orden o descuento): comisión, descuentos por tipo, neto y saldo
 *       pendiente PROYECTADOS — lo que liquidar_quincena calcularía si se
 *       liquidara ahora. inicio/fin deben ser exactamente los límites de
 *       una quincena real (1–15 o 16–fin de mes).
 *     parameters:
 *       - in: query
 *         name: inicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen de la quincena
 *       400:
 *         description: inicio/fin inválidos, o el periodo no es una quincena real
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 */
router.get(
  '/quincenas/resumen',
  autenticarJWT,
  PUEDEN_NOMINA,
  validarResumenQuincena,
  validar,
  obtenerResumenQuincena,
);

/**
 * @swagger
 * /api/nomina/colaboradores/{colaboradorId}/descuentos:
 *   get:
 *     tags: [Nómina]
 *     summary: Listar los descuentos de un colaborador en un periodo
 *     parameters:
 *       - in: path
 *         name: colaboradorId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: inicio
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fin
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Descuentos del colaborador en el periodo
 *       400:
 *         description: colaboradorId, inicio o fin inválidos
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 *       404:
 *         description: Colaborador no encontrado
 */
router.get(
  '/colaboradores/:colaboradorId/descuentos',
  autenticarJWT,
  PUEDEN_NOMINA,
  validarDescuentosDeColaborador,
  validar,
  listarDescuentosDeColaborador,
);

/**
 * @swagger
 * /api/nomina/descuentos:
 *   post:
 *     tags: [Nómina]
 *     summary: Registrar un descuento contra la quincena en curso de un colaborador
 *     description: >
 *       Solo tipo='prestamo' tiene límite (no puede superar la comisión
 *       acumulada menos los descuentos ya registrados en la quincena, ni
 *       el tope configurado); jabón/multa/cxc se registran sin ese
 *       límite, por diseño pueden superar la comisión.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DescuentoColaboradorRegistrar'
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201:
 *         description: Descuento registrado correctamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 *       404:
 *         description: El colaborador indicado no existe
 *       409:
 *         description: El colaborador no está activo, la quincena ya fue liquidada, o (solo préstamo) supera el disponible
 */
router.post(
  '/descuentos',
  autenticarJWT,
  PUEDEN_NOMINA,
  validarRegistrarDescuento,
  validar,
  registrarDescuento,
);

/**
 * @swagger
 * /api/nomina/quincenas/liquidar:
 *   post:
 *     tags: [Nómina]
 *     summary: Liquidar una quincena completa
 *     description: >
 *       Todo o nada: congela comisión/descuentos/neto/saldo pendiente por
 *       colaborador, marca las órdenes y descuentos del periodo, y crea
 *       el cxc de la quincena siguiente si algún colaborador queda con
 *       saldo pendiente (ver ADR 0006). La fecha de referencia para
 *       validar que la quincena ya terminó la fija el servidor (zona
 *       horaria America/Bogota); nunca se envía desde el cliente.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuincenaLiquidar'
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       201:
 *         description: Quincena liquidada correctamente
 *       400:
 *         description: El periodo no es una quincena real
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 *       409:
 *         description: La quincena aún no ha terminado, ya fue liquidada, existe una liquidación de un periodo posterior, hay órdenes abiertas, o algún colaborador tiene préstamos por encima de su comisión
 */
router.post(
  '/quincenas/liquidar',
  autenticarJWT,
  PUEDEN_NOMINA,
  validarLiquidarQuincena,
  validar,
  liquidarQuincena,
);

/**
 * @swagger
 * /api/nomina/liquidaciones:
 *   get:
 *     tags: [Nómina]
 *     summary: Listar el historial de liquidaciones de nómina, paginado
 *     parameters:
 *       - in: query
 *         name: pagina
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: porPagina
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Página de liquidaciones, con total y totalPaginas
 *       400:
 *         description: pagina o porPagina inválidos
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 */
router.get(
  '/liquidaciones',
  autenticarJWT,
  PUEDEN_NOMINA,
  validarFiltroListarLiquidaciones,
  validar,
  listarLiquidaciones,
);

/**
 * @swagger
 * /api/nomina/liquidaciones/{id}:
 *   get:
 *     tags: [Nómina]
 *     summary: Obtener una liquidación por id, con el detalle por colaborador
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - ApiKeyAuth: []
 *         BearerAuth: []
 *     responses:
 *       200:
 *         description: Liquidación encontrada
 *       400:
 *         description: Id inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: Operación permitida únicamente a superadmin o administrador
 *       404:
 *         description: Liquidación no encontrada
 */
router.get(
  '/liquidaciones/:id',
  autenticarJWT,
  PUEDEN_NOMINA,
  validarIdDeUrl,
  validar,
  obtenerLiquidacionPorId,
);

module.exports = router;
