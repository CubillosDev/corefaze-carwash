const jornadasService = require('../services/jornadas.service');
const ordenesLavadoService = require('../services/ordenesLavado.service');
const { ESTADOS_JORNADA } = require('../constants/dominio');

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

/** POST /api/jornadas: crea (abre) la jornada del día. */
const abrir = (_req, res, next) => {
  try {
    const jornada = jornadasService.abrirJornada();
    return res.status(201).json({ mensaje: 'Jornada abierta correctamente', jornada });
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/jornadas/:id/estado
 * El verbo va en el método HTTP, no en la URL: este único endpoint
 * reemplaza los antiguos POST /abrir, PATCH /:id/cerrar y PATCH
 * /:id/reabrir. El validator ya garantiza que "estado" es "cerrada" o
 * "abierta" (único otro valor del enum ESTADOS_JORNADA); el controller
 * solo despacha a la función de negocio correspondiente.
 */
const cambiarEstado = (req, res, next) => {
  try {
    const { id } = req.datos.parametros;
    const { estado } = req.datos.cuerpo;

    if (estado === ESTADOS_JORNADA.CERRADA) {
      const jornada = jornadasService.cerrarJornada(id);
      return res.status(200).json({ mensaje: 'Jornada cerrada correctamente', jornada });
    }

    const jornada = jornadasService.reabrirJornada(id);
    return res.status(200).json({ mensaje: 'Jornada reabierta correctamente', jornada });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listar, obtenerPorId, abrir, cambiarEstado };
