const ordenesLavadoService = require('../services/ordenesLavado.service');

/** GET /api/ordenes-lavado */
const listar = (req, res, next) => {
  try {
    const { fecha, colaboradorId, servicioId, medioPago, jornadaId } = req.datos.consulta;
    const ordenes = ordenesLavadoService.listarOrdenes({
      fecha,
      colaboradorId,
      servicioId,
      medioPago,
      jornadaId,
    });
    // Los totales se calculan SIEMPRE sobre este mismo arreglo filtrado,
    // para que coincidan exactamente con lo que el cliente ve en pantalla.
    return res
      .status(200)
      .json({ ordenes, totales: ordenesLavadoService.calcularTotales(ordenes) });
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
const crear = async (req, res, next) => {
  try {
    const orden = await ordenesLavadoService.crearOrden(req.datos.cuerpo);
    return res.status(201).json({ mensaje: 'Orden de lavado registrada correctamente', orden });
  } catch (error) {
    return next(error);
  }
};

/** PATCH /api/ordenes-lavado/:id */
const editar = async (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const orden = await ordenesLavadoService.editarOrden(id, req.datos.cuerpo);
    return res.status(200).json({ mensaje: 'Orden de lavado actualizada correctamente', orden });
  } catch (error) {
    return next(error);
  }
};

/** PATCH /api/ordenes-lavado/:id/estado */
const cambiarEstado = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const { estado, motivo } = req.datos.cuerpo;
    const orden = ordenesLavadoService.cambiarEstadoOrden(id, estado, motivo);
    return res.status(200).json({ mensaje: 'Estado de la orden actualizado correctamente', orden });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listar, obtenerPorId, crear, editar, cambiarEstado };
