const vehiculosService = require('../services/vehiculos.service');

/** GET /api/vehiculos */
const listar = (_req, res, next) => {
  try {
    return res.status(200).json({ vehiculos: vehiculosService.listarVehiculos() });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/vehiculos/:id */
const obtenerPorId = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const vehiculo = vehiculosService.obtenerVehiculoOFallar(id);
    return res.status(200).json({ vehiculo });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/vehiculos */
const crear = (req, res, next) => {
  try {
    const vehiculo = vehiculosService.crearVehiculo(req.datos.cuerpo);
    return res.status(201).json({ mensaje: 'Vehículo registrado correctamente', vehiculo });
  } catch (error) {
    return next(error);
  }
};

/** PUT /api/vehiculos/:id */
const actualizar = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const vehiculo = vehiculosService.actualizarVehiculo(id, req.datos.cuerpo);
    return res.status(200).json({ mensaje: 'Vehículo actualizado correctamente', vehiculo });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/vehiculos/:id
 *
 * La verificación "no se puede eliminar un vehículo con lavados" (409) se
 * conecta aquí cuando exista ordenesLavado.service.js, con el mismo patrón
 * que clienteTieneVehiculos en clientes.controller.js.
 */
const eliminar = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    vehiculosService.eliminarVehiculo(id);
    return res.status(200).json({ mensaje: 'Vehículo eliminado correctamente' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
