const ordenesLavadoService = require('../services/ordenesLavado.service');

/** GET /api/ordenes-lavado */
const listar = (req, res, next) => {
  try {
    const { fecha } = req.datos.consulta;
    return res.status(200).json({ ordenes: ordenesLavadoService.listarOrdenes({ fecha }) });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/ordenes-lavado/:id */
const obtenerPorId = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const orden = ordenesLavadoService.obtenerOrdenOFallar(id);
    return res.status(200).json({ orden });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/ordenes-lavado */
const crear = (req, res, next) => {
  try {
    const orden = ordenesLavadoService.crearOrden(req.datos.cuerpo);
    return res.status(201).json({ mensaje: 'Orden de lavado registrada correctamente', orden });
  } catch (error) {
    return next(error);
  }
};

/** PATCH /api/ordenes-lavado/:id/estado */
const cambiarEstado = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const { estado } = req.datos.cuerpo;
    const orden = ordenesLavadoService.cambiarEstadoOrden(id, estado);
    return res.status(200).json({ mensaje: 'Estado de la orden actualizado correctamente', orden });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listar, obtenerPorId, crear, cambiarEstado };
