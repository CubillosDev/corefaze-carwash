const colaboradoresService = require('../services/colaboradores.service');
const ordenesLavadoService = require('../services/ordenesLavado.service');
const { Conflicto } = require('../utils/errores');

/** GET /api/colaboradores */
const listar = (_req, res, next) => {
  try {
    return res.status(200).json({ colaboradores: colaboradoresService.listarColaboradores() });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/colaboradores/:id */
const obtenerPorId = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const colaborador = colaboradoresService.obtenerColaboradorOFallar(id);
    return res.status(200).json({ colaborador });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/colaboradores */
const crear = (req, res, next) => {
  try {
    const colaborador = colaboradoresService.crearColaborador(req.datos.cuerpo);
    return res.status(201).json({ mensaje: 'Colaborador registrado correctamente', colaborador });
  } catch (error) {
    return next(error);
  }
};

/** PUT /api/colaboradores/:id */
const actualizar = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const colaborador = colaboradoresService.actualizarColaborador(id, req.datos.cuerpo);
    return res.status(200).json({ mensaje: 'Colaborador actualizado correctamente', colaborador });
  } catch (error) {
    return next(error);
  }
};

/** PATCH /api/colaboradores/:id/estado */
const cambiarEstado = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const { estado } = req.datos.cuerpo;
    const colaborador = colaboradoresService.cambiarEstadoColaborador(id, estado);
    return res
      .status(200)
      .json({ mensaje: 'Estado del colaborador actualizado correctamente', colaborador });
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/colaboradores/:id
 * No se puede eliminar un colaborador que tenga órdenes de lavado asociadas (409).
 */
const eliminar = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;

    if (ordenesLavadoService.colaboradorTieneOrdenes(id)) {
      throw new Conflicto('No se puede eliminar un colaborador con órdenes de lavado asociadas');
    }

    colaboradoresService.eliminarColaborador(id);
    return res.status(200).json({ mensaje: 'Colaborador eliminado correctamente' });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listar, obtenerPorId, crear, actualizar, cambiarEstado, eliminar };
