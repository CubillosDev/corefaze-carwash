const usuariosService = require('../services/usuarios.service');

/**
 * Con Express 5, un error lanzado en un handler async llega al middleware
 * de errores solo: no hace falta try/catch aquí si no hay lógica extra en
 * el catch (ver errores.middleware.js).
 */

/** GET /api/usuarios */
const listar = async (req, res) => {
  const resultado = await usuariosService.listarUsuarios(req.datos.consulta);
  return res.status(200).json(resultado);
};

/** GET /api/usuarios/:id */
const obtenerPorId = async (req, res) => {
  const { id } = req.datos.parametros;
  const usuario = await usuariosService.obtenerUsuarioOFallar(id);
  return res.status(200).json({ usuario });
};

/** PATCH /api/usuarios/:id/estado */
const cambiarEstado = async (req, res) => {
  const { id } = req.datos.parametros;
  const { activo } = req.datos.cuerpo;
  const usuario = await usuariosService.cambiarEstadoUsuario(id, activo, req.usuario.id);
  return res.status(200).json({ mensaje: 'Estado del usuario actualizado correctamente', usuario });
};

module.exports = { listar, obtenerPorId, cambiarEstado };
