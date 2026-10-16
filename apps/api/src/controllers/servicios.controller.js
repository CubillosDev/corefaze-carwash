const serviciosService = require('../services/servicios.service');
const ordenesLavadoService = require('../services/ordenesLavado.service');
const { Conflicto } = require('../utils/errores');

/** GET /api/servicios */
const listar = (_req, res, next) => {
  try {
    return res.status(200).json({ servicios: serviciosService.listarServicios() });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/servicios/:id */
const obtenerPorId = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const servicio = serviciosService.obtenerServicioOFallar(id);
    return res.status(200).json({ servicio });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/servicios */
const crear = (req, res, next) => {
  try {
    const servicio = serviciosService.crearServicio(req.datos.cuerpo);
    return res.status(201).json({ mensaje: 'Servicio registrado correctamente', servicio });
  } catch (error) {
    return next(error);
  }
};

/** PUT /api/servicios/:id */
const actualizar = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const servicio = serviciosService.actualizarServicio(id, req.datos.cuerpo);
    return res.status(200).json({ mensaje: 'Servicio actualizado correctamente', servicio });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/servicios/:id
 * No se puede eliminar un servicio que tenga órdenes de lavado asociadas (409).
 */
const eliminar = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;

    if (ordenesLavadoService.servicioTieneOrdenes(id)) {
      throw new Conflicto('No se puede eliminar un servicio con órdenes de lavado asociadas');
    }

    serviciosService.eliminarServicio(id);
    return res.status(200).json({ mensaje: 'Servicio eliminado correctamente' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
