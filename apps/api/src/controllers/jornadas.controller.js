const jornadasService = require('../services/jornadas.service');
const ordenesLavadoService = require('../services/ordenesLavado.service');

/**
 * Agrega a la jornada sus totales (SCRUM-38): unidades y ventaTotal
 * vienen de sus propias órdenes; diferenciaCaja queda en null hasta que
 * exista el cierre de caja (arqueo), que todavía no está construido.
 * Devuelve un objeto nuevo: la jornada guardada en memoria nunca queda
 * con estos campos derivados pegados permanentemente.
 *
 * @param {object} jornada
 * @returns {object}
 */
const agregarTotales = (jornada) => {
  const { unidades, ventaTotal } = ordenesLavadoService.obtenerTotalesDeJornada(jornada.id);
  return { ...jornada, unidades, ventaTotal, diferenciaCaja: null };
};

/** GET /api/jornadas */
const listar = (req, res, next) => {
  try {
    const { desde, hasta } = req.datos.consulta;
    const jornadas = jornadasService.listarJornadas({ desde, hasta }).map(agregarTotales);
    return res.status(200).json({ jornadas });
  } catch (error) {
    return next(error);
  }
};

/** GET /api/jornadas/:id */
const obtenerPorId = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const jornada = jornadasService.obtenerJornadaOFallar(id);
    return res.status(200).json({ jornada: agregarTotales(jornada) });
  } catch (error) {
    return next(error);
  }
};

/** POST /api/jornadas/abrir */
const abrir = (_req, res, next) => {
  try {
    const jornada = jornadasService.abrirJornada();
    return res.status(201).json({ mensaje: 'Jornada abierta correctamente', jornada });
  } catch (error) {
    return next(error);
  }
};

/** PATCH /api/jornadas/:id/cerrar */
const cerrar = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const jornada = jornadasService.cerrarJornada(id);
    return res.status(200).json({ mensaje: 'Jornada cerrada correctamente', jornada });
  } catch (error) {
    return next(error);
  }
};

/** PATCH /api/jornadas/:id/reabrir */
const reabrir = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const jornada = jornadasService.reabrirJornada(id);
    return res.status(200).json({ mensaje: 'Jornada reabierta correctamente', jornada });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listar, obtenerPorId, abrir, cerrar, reabrir };
