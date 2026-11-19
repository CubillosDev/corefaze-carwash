const jornadaQrService = require('../services/jornadaQr.service');

/** POST /api/jornadas/qr */
const generar = async (req, res) => {
  const qr = await jornadaQrService.generarToken(req.usuario.id);
  return res.status(201).json({ qr });
};

/** POST /api/jornadas/qr/canje */
const canjear = async (req, res) => {
  const jornada = await jornadaQrService.canjearToken(req.datos.cuerpo.contenido, req.usuario.id);
  return res.status(201).json({ mensaje: 'Jornada abierta correctamente', jornada });
};

module.exports = { generar, canjear };
