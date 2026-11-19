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

module.exports = {
  listarClientes,
  listarOrdenesPendientes,
  listarPagos,
  obtenerPagoPorId,
  registrarPago,
};
