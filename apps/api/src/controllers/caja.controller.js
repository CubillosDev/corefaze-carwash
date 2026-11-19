const cajaService = require('../services/caja.service');

/** GET /api/caja */
const obtenerEstado = async (req, res) => {
  const estado = await cajaService.obtenerEstado(req.datos.consulta);
  return res.status(200).json(estado);
};

/** POST /api/caja/apertura */
const abrir = async (req, res) => {
  const caja = await cajaService.abrirCaja(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Caja abierta', caja });
};

/** POST /api/caja/egresos */
const registrarEgreso = async (req, res) => {
  const egreso = await cajaService.registrarEgreso(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Egreso registrado', egreso });
};

/** POST /api/caja/cobros */
const registrarCobro = async (req, res) => {
  const cobro = await cajaService.registrarCobro(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Cobro registrado', cobro });
};

/** POST /api/caja/cierre */
const cerrar = async (req, res) => {
  const caja = await cajaService.cerrarCaja(req.datos.cuerpo, req.usuario.id);
  return res.status(200).json({ mensaje: 'Caja cerrada', caja });
};

/** POST /api/caja/:id/reapertura */
const reabrir = async (req, res) => {
  const caja = await cajaService.reabrirCaja(req.datos.parametros.id, req.usuario.id);
  return res.status(200).json({ mensaje: 'Caja reabierta', caja });
};

module.exports = { obtenerEstado, abrir, registrarEgreso, registrarCobro, cerrar, reabrir };
