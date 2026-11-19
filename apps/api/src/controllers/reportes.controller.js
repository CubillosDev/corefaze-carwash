const reportesService = require('../services/reportes.service');

/** GET /api/reportes/resumen */
const obtenerResumen = async (req, res) => {
  const reporte = await reportesService.obtenerResumen(req.datos.consulta);
  return res.status(200).json({ reporte });
};

/** GET /api/reportes/ingresos-por-hora */
const obtenerIngresosPorHora = async (req, res) => {
  const curva = await reportesService.obtenerIngresosPorHora(req.datos.consulta);
  return res.status(200).json({ curva });
};

module.exports = { obtenerResumen, obtenerIngresosPorHora };
