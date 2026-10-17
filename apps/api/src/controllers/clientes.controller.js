const clientesService = require('../services/clientes.service');
const vehiculosService = require('../services/vehiculos.service');
const { Conflicto } = require('../utils/errores');

/** GET /api/clientes */
const listar = (_req, res, next) => {
  try {
    return res.status(200).json({ clientes: clientesService.listarClientes() });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/clientes/:id */
const obtenerPorId = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const cliente = clientesService.obtenerClienteOFallar(id);
    return res.status(200).json({ cliente });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/clientes */
const crear = (req, res, next) => {
  try {
    const cliente = clientesService.crearCliente(req.datos.cuerpo);
    return res.status(201).json({ mensaje: 'Cliente registrado correctamente', cliente });
  } catch (error) {
    return next(error);
  }
};

/** PUT /api/clientes/:id */
const actualizar = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const cliente = clientesService.actualizarCliente(id, req.datos.cuerpo);
    return res.status(200).json({ mensaje: 'Cliente actualizado correctamente', cliente });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/clientes/:id
 * No se puede eliminar un cliente que tenga vehículos asociados (409).
 */
const eliminar = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;

    if (vehiculosService.clienteTieneVehiculos(id)) {
      throw new Conflicto('No se puede eliminar un cliente con vehículos asociados');
    }

    clientesService.eliminarCliente(id);
    return res.status(200).json({ mensaje: 'Cliente eliminado correctamente' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
