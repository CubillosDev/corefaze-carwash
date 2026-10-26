const clientesService = require('../services/clientes.service');
const vehiculosService = require('../services/vehiculos.service');
const { Conflicto } = require('../utils/errores');

/**
 * Con Express 5, un error lanzado en un handler async (incluso un rechazo
 * sin try/catch) llega al middleware de errores solo: no hace falta
 * try/catch aquí si no hay lógica extra en el catch (ver
 * errores.middleware.js).
 */

/** GET /api/clientes */
const listar = async (_req, res) => {
  const clientes = await clientesService.listarClientes();
  return res.status(200).json({ clientes });
};

/** GET /api/clientes/:id */
const obtenerPorId = async (req, res) => {
  const { id } = req.datos.parametros;
  const cliente = await clientesService.obtenerClienteOFallar(id);
  return res.status(200).json({ cliente });
};

/** POST /api/clientes */
const crear = async (req, res) => {
  const cliente = await clientesService.crearCliente(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Cliente registrado correctamente', cliente });
};

/** PUT /api/clientes/:id */
const actualizar = async (req, res) => {
  const { id } = req.datos.parametros;
  const cliente = await clientesService.actualizarCliente(id, req.datos.cuerpo, req.usuario.id);
  return res.status(200).json({ mensaje: 'Cliente actualizado correctamente', cliente });
};

/**
 * DELETE /api/clientes/:id
 * No se puede eliminar un cliente que tenga vehículos asociados (409).
 */
const eliminar = async (req, res) => {
  const { id } = req.datos.parametros;

  if (vehiculosService.clienteTieneVehiculos(id)) {
    throw new Conflicto('No se puede eliminar un cliente con vehículos asociados');
  }

  await clientesService.eliminarCliente(id, req.usuario.id);
  return res.status(200).json({ mensaje: 'Cliente eliminado correctamente' });
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
