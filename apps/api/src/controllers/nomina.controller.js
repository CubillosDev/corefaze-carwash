const nominaService = require('../services/nomina.service');

/** GET /api/nomina/quincena */
const obtenerQuincena = async (req, res) => {
  const quincena = await nominaService.obtenerQuincena(req.datos.consulta);
  return res.status(200).json({ quincena });
};

/** POST /api/nomina/descuentos */
const registrarDescuento = async (req, res) => {
  const descuento = await nominaService.registrarDescuento(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Descuento registrado', descuento });
};

/** POST /api/nomina/liquidaciones */
const liquidar = async (req, res) => {
  const liquidacion = await nominaService.liquidarQuincena(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Quincena liquidada', liquidacion });
};

/** GET /api/nomina/liquidaciones */
const listarLiquidaciones = async (_req, res) => {
  const liquidaciones = await nominaService.listarLiquidaciones();
  return res.status(200).json({ liquidaciones });
};

module.exports = { obtenerQuincena, registrarDescuento, liquidar, listarLiquidaciones };
