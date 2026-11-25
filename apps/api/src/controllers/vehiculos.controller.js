const vehiculosService = require('../services/vehiculos.service');
const ordenesLavadoService = require('../services/ordenesLavado.service');
const { Conflicto } = require('../utils/errores');

/**
 * Con Express 5, un error lanzado en un handler async llega al middleware
 * de errores solo: no hace falta try/catch aquí si no hay lógica extra en
 * el catch (ver errores.middleware.js).
 */

/** GET /api/vehiculos (?placa= opcional, exacta) */
const listar = async (req, res) => {
  const { placa } = req.datos.consulta;
  const vehiculos = await vehiculosService.listarVehiculos({ placa });
  return res.status(200).json({ vehiculos });
};

/**
 * GET /api/vehiculos/consulta/:placa
 * Vehículo, dueño e historial en una sola respuesta, para la recepción en
 * la app móvil (ADR 0011). Una placa no registrada responde 200 con
 * registrado: false.
 */
const consultarPlaca = async (req, res) => {
  const { placa } = req.datos.parametros;
  const consulta = await vehiculosService.consultarPlaca(placa);
  return res.status(200).json(consulta);
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

module.exports = { listar, consultarPlaca, obtenerPorId, crear, actualizar, eliminar };
