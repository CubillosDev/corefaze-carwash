const jornadasService = require('../services/jornadas.service');
const ordenesLavadoService = require('../services/ordenesLavado.service');
const { ESTADOS_JORNADA } = require('../constants/dominio');

/**
 * Con Express 5, un error lanzado en un handler async llega al middleware
 * de errores solo: no hace falta try/catch aquí si no hay lógica extra en
 * el catch (ver errores.middleware.js).
 */

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
const listar = async (req, res) => {
  const { desde, hasta } = req.datos.consulta;
  const jornadas = (await jornadasService.listarJornadas({ desde, hasta })).map(agregarTotales);
  return res.status(200).json({ jornadas });
};

/** GET /api/jornadas/:id */
const obtenerPorId = async (req, res) => {
  const { id } = req.datos.parametros;
  const jornada = await jornadasService.obtenerJornadaOFallar(id);
  return res.status(200).json({ jornada: agregarTotales(jornada) });
};

/** POST /api/jornadas: crea (abre) la jornada del día. */
const abrir = async (req, res) => {
  const jornada = await jornadasService.abrirJornada(req.usuario.id);
  return res.status(201).json({ mensaje: 'Jornada abierta correctamente', jornada });
};

/**
 * PATCH /api/jornadas/:id/estado
 * El verbo va en el método HTTP, no en la URL: este único endpoint
 * reemplaza los antiguos POST /abrir, PATCH /:id/cerrar y PATCH
 * /:id/reabrir. El validator ya garantiza que "estado" es "cerrada" o
 * "abierta" (único otro valor del enum ESTADOS_JORNADA); el controller
 * solo despacha a la función de negocio correspondiente.
 */
const cambiarEstado = async (req, res) => {
  const { id } = req.datos.parametros;
  const { estado } = req.datos.cuerpo;

  if (estado === ESTADOS_JORNADA.CERRADA) {
    const jornada = await jornadasService.cerrarJornada(id, req.usuario.id);
    return res.status(200).json({ mensaje: 'Jornada cerrada correctamente', jornada });
  }

  const jornada = await jornadasService.reabrirJornada(id, req.usuario.id);
  return res.status(200).json({ mensaje: 'Jornada reabierta correctamente', jornada });
};

module.exports = { listar, obtenerPorId, abrir, cambiarEstado };
