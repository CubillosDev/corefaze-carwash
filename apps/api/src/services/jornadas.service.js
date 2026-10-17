const jornadas = require('../data/jornadas');
const { ESTADOS_JORNADA } = require('../constants/dominio');
const { Conflicto, NoEncontrado } = require('../utils/errores');

/**
 * YYYY-MM-DD en la zona horaria del negocio (America/Bogota), nunca en
 * la del servidor: la fecha de una jornada nunca viene del cliente, y
 * si el servidor corre en UTC (u otra zona), abrir a las 8 p.m. hora
 * Bogotá no debe adelantar la fecha un día. El locale 'en-CA' da
 * directamente el formato YYYY-MM-DD.
 */
const obtenerFechaDeHoy = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

const buscarPorFecha = (fecha) => jornadas.find((jornada) => jornada.fecha === fecha);

/**
 * Devuelve la jornada abierta, si existe. Solo puede haber una a la vez en
 * todo el sistema, sin importar su fecha.
 * @returns {object | null}
 */
const obtenerJornadaAbierta = () =>
  jornadas.find((jornada) => jornada.estado === ESTADOS_JORNADA.ABIERTA) ?? null;

/**
 * Obtiene una jornada por id.
 * @param {number|string} id
 * @returns {object | null}
 */
const obtenerJornadaPorId = (id) => {
  const jornada = jornadas.find((candidata) => candidata.id === Number(id));
  return jornada ?? null;
};

/**
 * Obtiene una jornada por id, o lanza NoEncontrado (404).
 * @param {number|string} id
 * @returns {object}
 * @throws {NoEncontrado}
 */
const obtenerJornadaOFallar = (id) => {
  const jornada = obtenerJornadaPorId(id);
  if (!jornada) {
    throw new NoEncontrado('Jornada no encontrada');
  }
  return jornada;
};

/**
 * Lista jornadas, opcionalmente acotadas por rango de fecha (comparación
 * lexicográfica de strings ISO, igual que ordenesLavado.service.js).
 * @param {{ desde?: string, hasta?: string }} [filtros]
 * @returns {object[]}
 */
const listarJornadas = (filtros = {}) => {
  let resultado = jornadas;
  if (filtros.desde !== undefined) {
    resultado = resultado.filter((jornada) => jornada.fecha >= filtros.desde);
  }
  if (filtros.hasta !== undefined) {
    resultado = resultado.filter((jornada) => jornada.fecha <= filtros.hasta);
  }
  return resultado;
};

/**
 * Abre la jornada del día. La fecha es siempre la de hoy en el servidor.
 *
 * Dos restricciones independientes:
 * - Solo puede existir UNA jornada abierta a la vez, sin importar su fecha.
 * - Solo puede existir UNA jornada por fecha calendario (no se crean dos
 *   filas para el mismo día, esté la de hoy abierta o cerrada).
 *
 * @returns {object} la jornada abierta
 * @throws {Conflicto} si ya hay una jornada abierta, o ya existe una jornada para hoy
 */
const abrirJornada = () => {
  if (obtenerJornadaAbierta()) {
    throw new Conflicto('Ya existe una jornada abierta');
  }

  const fechaDeHoy = obtenerFechaDeHoy();
  if (buscarPorFecha(fechaDeHoy)) {
    throw new Conflicto('Ya existe una jornada registrada para hoy');
  }

  const nuevaJornada = {
    id: jornadas.length > 0 ? Math.max(...jornadas.map((jornada) => jornada.id)) + 1 : 1,
    fecha: fechaDeHoy,
    estado: ESTADOS_JORNADA.ABIERTA,
    abiertaEn: new Date().toISOString(),
    abiertaPor: null,
    cerradaEn: null,
    cerradaPor: null,
    reaperturas: [],
  };

  jornadas.push(nuevaJornada);
  return nuevaJornada;
};

/**
 * Cierra una jornada abierta.
 * @param {number|string} id
 * @returns {object} la jornada cerrada
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si la jornada no está abierta
 */
const cerrarJornada = (id) => {
  const jornada = obtenerJornadaOFallar(id);

  if (jornada.estado !== ESTADOS_JORNADA.ABIERTA) {
    throw new Conflicto('Solo se puede cerrar una jornada abierta');
  }

  jornada.estado = ESTADOS_JORNADA.CERRADA;
  jornada.cerradaEn = new Date().toISOString();
  return jornada;
};

/**
 * Reabre una jornada cerrada (pensado para rol DUEÑO; el RBAC por rol
 * todavía no existe en el proyecto, así que este service no lo exige
 * todavía). Cada reapertura queda registrada en `reaperturas` como
 * auditoría mínima de quién/cuándo, hasta que exista un sistema de
 * auditoría genérico.
 *
 * @param {number|string} id
 * @returns {object} la jornada reabierta
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si la jornada no está cerrada, o ya hay otra jornada abierta
 */
const reabrirJornada = (id) => {
  const jornada = obtenerJornadaOFallar(id);

  if (jornada.estado !== ESTADOS_JORNADA.CERRADA) {
    throw new Conflicto('Solo se puede reabrir una jornada cerrada');
  }

  if (obtenerJornadaAbierta()) {
    throw new Conflicto('No se puede reabrir: ya hay otra jornada abierta');
  }

  jornada.estado = ESTADOS_JORNADA.ABIERTA;
  jornada.reaperturas.push({ en: new Date().toISOString() });
  return jornada;
};

/**
 * ¿La jornada está abierta? La consumirá Órdenes de lavado (próximo paso)
 * para rechazar registrar una orden en una jornada cerrada.
 *
 * @param {number|string} id
 * @returns {boolean}
 */
const jornadaEstaAbierta = (id) => {
  const jornada = obtenerJornadaPorId(id);
  return jornada !== null && jornada.estado === ESTADOS_JORNADA.ABIERTA;
};

module.exports = {
  obtenerJornadaAbierta,
  obtenerJornadaPorId,
  obtenerJornadaOFallar,
  listarJornadas,
  abrirJornada,
  cerrarJornada,
  reabrirJornada,
  jornadaEstaAbierta,
};
