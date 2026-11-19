const nominaService = require('../services/nomina.service');

/**
 * Con Express 5, un error lanzado en un handler async llega al middleware
 * de errores solo: no hace falta try/catch aquí si no hay lógica extra en
 * el catch (ver errores.middleware.js).
 */

/** GET /api/nomina/quincenas/resumen */
const obtenerResumenQuincena = async (req, res) => {
  const resumen = await nominaService.obtenerResumenQuincena(req.datos.consulta);
  return res.status(200).json(resumen);
};

/** GET /api/nomina/colaboradores/:colaboradorId/descuentos */
const listarDescuentosDeColaborador = async (req, res) => {
  const { colaboradorId } = req.datos.parametros;
  const { inicio, fin } = req.datos.consulta;
  const resultado = await nominaService.listarDescuentosDeColaborador(colaboradorId, {
    inicio,
    fin,
  });
  return res.status(200).json(resultado);
};

/** POST /api/nomina/descuentos */
const registrarDescuento = async (req, res) => {
  const descuento = await nominaService.registrarDescuento(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Descuento registrado correctamente', descuento });
};

/** POST /api/nomina/quincenas/liquidar */
const liquidarQuincena = async (req, res) => {
  const liquidacion = await nominaService.liquidarQuincena(req.datos.cuerpo, req.usuario.id);
  return res.status(201).json({ mensaje: 'Quincena liquidada correctamente', liquidacion });
};

/** GET /api/nomina/liquidaciones */
const listarLiquidaciones = async (req, res) => {
  const resultado = await nominaService.listarLiquidaciones(req.datos.consulta);
  return res.status(200).json(resultado);
};

/** GET /api/nomina/liquidaciones/:id */
const obtenerLiquidacionPorId = async (req, res) => {
  const { id } = req.datos.parametros;
  const liquidacion = await nominaService.obtenerLiquidacionOFallar(id);
  return res.status(200).json({ liquidacion });
};

module.exports = {
  obtenerResumenQuincena,
  listarDescuentosDeColaborador,
  registrarDescuento,
  liquidarQuincena,
  listarLiquidaciones,
  obtenerLiquidacionPorId,
};
