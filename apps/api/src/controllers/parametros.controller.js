const parametrosService = require('../services/parametros.service');

/**
 * Con Express 5, un error lanzado en un handler async llega al middleware
 * de errores solo: no hace falta try/catch aquí si no hay lógica extra en
 * el catch (ver errores.middleware.js).
 */

/** GET /api/parametros */
const obtener = async (_req, res) => {
  const parametros = await parametrosService.obtenerParametros();
  return res.status(200).json({ parametros });
};

/** PATCH /api/parametros: restringido a superadmin (lo exige la ruta). */
const actualizar = async (req, res) => {
  const parametros = await parametrosService.actualizarParametros(req.datos.cuerpo, req.usuario.id);
  return res
    .status(200)
    .json({ mensaje: 'Parámetros de negocio actualizados correctamente', parametros });
};

module.exports = { obtener, actualizar };
