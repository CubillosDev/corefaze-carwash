const creditoService = require('../services/credito.service');

/**
 * Con Express 5, un error lanzado en un handler async llega al middleware
 * de errores solo: no hace falta try/catch aquí si no hay lógica extra en
 * el catch (ver errores.middleware.js).
 */

/** GET /api/credito/clientes */
const listarClientes = async (_req, res) => {
  const clientes = await creditoService.listarClientesConCredito();
  return res.status(200).json({ clientes });
};

/** GET /api/credito/clientes/:id/ordenes-pendientes */
const listarOrdenesPendientes = async (req, res) => {
  const { id } = req.datos.parametros;
  const ordenes = await creditoService.listarOrdenesPendientesDeCliente(id);
  return res.status(200).json({ ordenes });
};

/** GET /api/credito/pagos */
const listarPagos = async (req, res) => {
  const resultado = await creditoService.listarPagos(req.datos.consulta);
  return res.status(200).json(resultado);
};

/** GET /api/credito/pagos/:id */
const obtenerPagoPorId = async (req, res) => {
  const { id } = req.datos.parametros;
  const pago = await creditoService.obtenerPagoOFallar(id);
  return res.status(200).json({ pago });
};

/** POST /api/credito/pagos */
const registrarPago = async (req, res) => {
  const pago = await creditoService.registrarPagoCredito(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Pago de crédito registrado correctamente', pago });
};

/** GET /api/credito/clientes/:id/ordenes */
const listarOrdenesDeCliente = async (req, res) => {
  const ordenes = await creditoService.listarOrdenesCreditoDeCliente(req.datos.parametros.id, req.datos.consulta);
  return res.status(200).json({ ordenes });
};

/** PATCH /api/credito/clientes/:id/condiciones */
const actualizarCondiciones = async (req, res) => {
  const cliente = await creditoService.actualizarCondiciones(req.datos.parametros.id, req.datos.cuerpo, req.usuario.id);
  return res.status(200).json({ mensaje: 'Condiciones de crédito actualizadas', cliente });
};

/** POST /api/credito/vales */
const registrarVale = async (req, res) => {
  const vale = await creditoService.registrarVale(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Vale registrado', vale });
};

/** POST /api/credito/vales/verificacion */
const verificarVale = async (req, res) => {
  const verificacion = await creditoService.verificarVale(req.datos.cuerpo, req.usuario.id);
  return res.status(200).json({ verificacion });
};

/** PATCH /api/credito/vales/:ordenId */
const marcarVale = async (req, res) => {
  const vale = await creditoService.marcarVerificacion(
    req.datos.parametros.ordenId,
    req.datos.cuerpo.verificado,
    req.usuario.id,
  );
  return res.status(200).json({ vale });
};

module.exports = {
  listarClientes,
  listarOrdenesPendientes,
  listarPagos,
  obtenerPagoPorId,
  registrarPago,
  listarOrdenesDeCliente,
  actualizarCondiciones,
  registrarVale,
  verificarVale,
  marcarVale,
};
