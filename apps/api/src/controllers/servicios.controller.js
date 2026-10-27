const serviciosService = require('../services/servicios.service');
const ordenesLavadoService = require('../services/ordenesLavado.service');
const { Conflicto } = require('../utils/errores');

/**
 * Con Express 5, un error lanzado en un handler async llega al middleware
 * de errores solo: no hace falta try/catch aquí si no hay lógica extra en
 * el catch (ver errores.middleware.js).
 */

/** GET /api/servicios */
const listar = async (_req, res) => {
  const servicios = await serviciosService.listarServicios();
  return res.status(200).json({ servicios });
};

/** GET /api/servicios/:id */
const obtenerPorId = async (req, res) => {
  const { id } = req.datos.parametros;
  const servicio = await serviciosService.obtenerServicioOFallar(id);
  return res.status(200).json({ servicio });
};

/** POST /api/servicios */
const crear = async (req, res) => {
  const servicio = await serviciosService.crearServicio(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Servicio registrado correctamente', servicio });
};

/** PUT /api/servicios/:id */
const actualizar = async (req, res) => {
  const { id } = req.datos.parametros;
  const servicio = await serviciosService.actualizarServicio(id, req.datos.cuerpo, req.usuario.id);
  return res.status(200).json({ mensaje: 'Servicio actualizado correctamente', servicio });
};

/**
 * DELETE /api/servicios/:id
 * No se puede eliminar un servicio que tenga órdenes de lavado asociadas (409).
 */
const eliminar = async (req, res) => {
  const { id } = req.datos.parametros;

  if (ordenesLavadoService.servicioTieneOrdenes(id)) {
    throw new Conflicto('No se puede eliminar un servicio con órdenes de lavado asociadas');
  }

  await serviciosService.eliminarServicio(id, req.usuario.id);
  return res.status(200).json({ mensaje: 'Servicio eliminado correctamente' });
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
