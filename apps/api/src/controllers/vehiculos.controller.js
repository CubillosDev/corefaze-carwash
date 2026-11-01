const vehiculosService = require('../services/vehiculos.service');
const ordenesLavadoService = require('../services/ordenesLavado.service');
const { Conflicto } = require('../utils/errores');

/**
 * Con Express 5, un error lanzado en un handler async llega al middleware
 * de errores solo: no hace falta try/catch aquí si no hay lógica extra en
 * el catch (ver errores.middleware.js).
 */

/** GET /api/vehiculos */
const listar = async (_req, res) => {
  const vehiculos = await vehiculosService.listarVehiculos();
  return res.status(200).json({ vehiculos });
};

/** GET /api/vehiculos/:id */
const obtenerPorId = async (req, res) => {
  const { id } = req.datos.parametros;
  const vehiculo = await vehiculosService.obtenerVehiculoOFallar(id);
  return res.status(200).json({ vehiculo });
};

/** POST /api/vehiculos */
const crear = async (req, res) => {
  const vehiculo = await vehiculosService.crearVehiculo(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Vehículo registrado correctamente', vehiculo });
};

/** PUT /api/vehiculos/:id */
const actualizar = async (req, res) => {
  const { id } = req.datos.parametros;
  const vehiculo = await vehiculosService.actualizarVehiculo(id, req.datos.cuerpo, req.usuario.id);
  return res.status(200).json({ mensaje: 'Vehículo actualizado correctamente', vehiculo });
};

/**
 * DELETE /api/vehiculos/:id
 * No se puede eliminar un vehículo que tenga órdenes de lavado asociadas (409).
 */
const eliminar = async (req, res) => {
  const { id } = req.datos.parametros;

  if (await ordenesLavadoService.vehiculoTieneOrdenes(id)) {
    throw new Conflicto('No se puede eliminar un vehículo con órdenes de lavado asociadas');
  }

  await vehiculosService.eliminarVehiculo(id, req.usuario.id);
  return res.status(200).json({ mensaje: 'Vehículo eliminado correctamente' });
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
