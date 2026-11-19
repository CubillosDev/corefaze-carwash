const colaboradoresService = require('../services/colaboradores.service');
const ordenesLavadoService = require('../services/ordenesLavado.service');
const { Conflicto } = require('../utils/errores');

/**
 * Con Express 5, un error lanzado en un handler async llega al middleware
 * de errores solo: no hace falta try/catch aquí si no hay lógica extra en
 * el catch (ver errores.middleware.js).
 */

/** GET /api/colaboradores */
const listar = async (_req, res) => {
  const colaboradores = await colaboradoresService.listarColaboradores();
  return res.status(200).json({ colaboradores });
};

/** GET /api/colaboradores/:id */
const obtenerPorId = async (req, res) => {
  const { id } = req.datos.parametros;
  const colaborador = await colaboradoresService.obtenerColaboradorOFallar(id);
  return res.status(200).json({ colaborador });
};

/** POST /api/colaboradores */
const crear = async (req, res) => {
  const colaborador = await colaboradoresService.crearColaborador(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Colaborador registrado correctamente', colaborador });
};

/** PUT /api/colaboradores/:id */
const actualizar = async (req, res) => {
  const { id } = req.datos.parametros;
  const colaborador = await colaboradoresService.actualizarColaborador(
    id,
    req.datos.cuerpo,
    req.usuario.id,
  );
  return res.status(200).json({ mensaje: 'Colaborador actualizado correctamente', colaborador });
};

/** PATCH /api/colaboradores/:id/estado */
const cambiarEstado = async (req, res) => {
  const { id } = req.datos.parametros;
  const { estado } = req.datos.cuerpo;
  const colaborador = await colaboradoresService.cambiarEstadoColaborador(
    id,
    estado,
    req.usuario.id,
  );
  return res
    .status(200)
    .json({ mensaje: 'Estado del colaborador actualizado correctamente', colaborador });
};

/**
 * DELETE /api/colaboradores/:id
 * No se puede eliminar un colaborador que tenga órdenes de lavado asociadas (409).
 */
const eliminar = async (req, res) => {
  const { id } = req.datos.parametros;

  if (await ordenesLavadoService.colaboradorTieneOrdenes(id)) {
    throw new Conflicto('No se puede eliminar un colaborador con órdenes de lavado asociadas');
  }

  await colaboradoresService.eliminarColaborador(id, req.usuario.id);
  return res.status(200).json({ mensaje: 'Colaborador eliminado correctamente' });
};

module.exports = { listar, obtenerPorId, crear, actualizar, cambiarEstado, eliminar };
