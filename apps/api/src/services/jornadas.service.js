const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const { ESTADOS_JORNADA } = require('../constants/dominio');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');

// El alias de reaperturas es el select anidado documentado en el contrato
// de integración (supabase/README.md): la API sigue devolviendo
// reaperturas: [{ en }], aunque en la BD es una tabla aparte
// (reaperturas_jornada), con la columna creado_en aliaseada a "en".
const COLUMNAS =
  'id, fecha, estado, abierta_en, abierta_por, cerrada_en, cerrada_por, reaperturas:reaperturas_jornada(en:creado_en)';

/**
 * Traduce un error de Postgres (vía supabase-js) a una de las clases de
 * utils/errores.js. Los códigos son los que las migraciones de
 * `jornadas`/`reaperturas_jornada` pueden disparar.
 */
const traducirErrorPostgres = (error) => {
  // 23505 unique_violation: dos posibles índices únicos.
  if (error.code === '23505') {
    if (error.message.includes('idx_jornadas_una_abierta')) {
      return new Conflicto('Ya existe una jornada abierta');
    }
    // jornadas_fecha_key
    return new Conflicto('Ya existe una jornada registrada para hoy');
  }

  // 23514 check_violation: formato o regla de negocio de jornadas.
  if (error.code === '23514') {
    return new SolicitudInvalida([], 'Datos de jornada inválidos');
  }

  return new Error(`Error de base de datos en jornadas: ${error.message}`);
};

/**
 * YYYY-MM-DD en la zona horaria del negocio (America/Bogota), nunca en
 * la del servidor: la fecha de una jornada nunca viene del cliente, y
 * si el servidor corre en UTC (u otra zona), abrir a las 8 p.m. hora
 * Bogotá no debe adelantar la fecha un día. El locale 'en-CA' da
 * directamente el formato YYYY-MM-DD.
 */
const obtenerFechaDeHoy = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

/**
 * Devuelve la jornada abierta, si existe. Solo puede haber una a la vez en
 * todo el sistema, sin importar su fecha.
 * @returns {Promise<object | null>}
 */
const obtenerJornadaAbierta = async () => {
  const { data, error } = await supabase
    .from('jornadas')
    .select(COLUMNAS)
    .eq('estado', ESTADOS_JORNADA.ABIERTA)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo consultar la jornada abierta: ${error.message}`);
  }

  return data ? aCamelCase(data) : null;
};

/**
 * Obtiene una jornada por id.
 * @param {number|string} id
 * @returns {Promise<object | null>}
 */
const obtenerJornadaPorId = async (id) => {
  const { data, error } = await supabase
    .from('jornadas')
    .select(COLUMNAS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener la jornada: ${error.message}`);
  }

  return data ? aCamelCase(data) : null;
};

/**
 * Obtiene una jornada por id, o lanza NoEncontrado (404).
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NoEncontrado}
 */
const obtenerJornadaOFallar = async (id) => {
  const jornada = await obtenerJornadaPorId(id);
  if (!jornada) {
    throw new NoEncontrado('Jornada no encontrada');
  }
  return jornada;
};

/**
 * Lista jornadas, opcionalmente acotadas por rango de fecha.
 * @param {{ desde?: string, hasta?: string }} [filtros]
 * @returns {Promise<object[]>}
 */
const listarJornadas = async (filtros = {}) => {
  let consulta = supabase.from('jornadas').select(COLUMNAS).order('fecha', { ascending: true });

  if (filtros.desde !== undefined) {
    consulta = consulta.gte('fecha', filtros.desde);
  }
  if (filtros.hasta !== undefined) {
    consulta = consulta.lte('fecha', filtros.hasta);
  }

  const { data, error } = await consulta;

  if (error) {
    throw new Error(`No se pudo listar jornadas: ${error.message}`);
  }

  return aCamelCase(data);
};

/**
 * Abre la jornada del día. La fecha es siempre la de hoy en el servidor.
 *
 * Dos restricciones independientes:
 * - Solo puede existir UNA jornada abierta a la vez, sin importar su
 *   fecha — lo protege también el índice único parcial idx_jornadas_una_abierta.
 * - Solo puede existir UNA jornada por fecha calendario — lo protege
 *   también jornadas_fecha_key.
 *
 * @param {number} abiertaPorId id del usuario autenticado que abre la jornada (SCRUM-152: antes era su email)
 * @returns {Promise<object>} la jornada abierta
 * @throws {Conflicto} si ya hay una jornada abierta, o ya existe una jornada para hoy
 */
const abrirJornada = async (abiertaPorId = null) => {
  if (await obtenerJornadaAbierta()) {
    throw new Conflicto('Ya existe una jornada abierta');
  }

  const fechaDeHoy = obtenerFechaDeHoy();

  const { data, error } = await crearClienteConUsuario(abiertaPorId)
    .from('jornadas')
    .insert({ fecha: fechaDeHoy, abierta_por: abiertaPorId })
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
};

/**
 * Cierra una jornada abierta.
 * @param {number|string} id
 * @param {number} cerradaPorId id del usuario autenticado que cierra la jornada
 * @returns {Promise<object>} la jornada cerrada
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si la jornada no está abierta
 */
const cerrarJornada = async (id, cerradaPorId) => {
  const jornada = await obtenerJornadaOFallar(id);

  if (jornada.estado !== ESTADOS_JORNADA.ABIERTA) {
    throw new Conflicto('Solo se puede cerrar una jornada abierta');
  }

  const { data, error } = await crearClienteConUsuario(cerradaPorId)
    .from('jornadas')
    .update({
      estado: ESTADOS_JORNADA.CERRADA,
      cerrada_en: new Date().toISOString(),
      cerrada_por: cerradaPorId,
    })
    .eq('id', id)
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
};

/**
 * Reabre una jornada cerrada. Restringido a rol superadmin (SCRUM-139); la
 * autorización la exige el middleware de la ruta, no este service. Cada
 * reapertura queda registrada como una fila en reaperturas_jornada (antes
 * un arreglo en memoria), con quién la reabrió.
 *
 * @param {number|string} id
 * @param {number} reabiertaPorId id del usuario autenticado que reabre la jornada
 * @returns {Promise<object>} la jornada reabierta
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si la jornada no está cerrada, o ya hay otra jornada abierta
 */
const reabrirJornada = async (id, reabiertaPorId) => {
  const jornada = await obtenerJornadaOFallar(id);

  if (jornada.estado !== ESTADOS_JORNADA.CERRADA) {
    throw new Conflicto('Solo se puede reabrir una jornada cerrada');
  }

  if (await obtenerJornadaAbierta()) {
    throw new Conflicto('No se puede reabrir: ya hay otra jornada abierta');
  }

  const cliente = crearClienteConUsuario(reabiertaPorId);

  const { error: errorJornada } = await cliente
    .from('jornadas')
    .update({ estado: ESTADOS_JORNADA.ABIERTA })
    .eq('id', id);

  if (errorJornada) {
    throw traducirErrorPostgres(errorJornada);
  }

  const { error: errorReapertura } = await cliente
    .from('reaperturas_jornada')
    .insert({ jornada_id: id, reabierta_por: reabiertaPorId });

  if (errorReapertura) {
    throw traducirErrorPostgres(errorReapertura);
  }

  return obtenerJornadaOFallar(id);
};

/**
 * ¿La jornada está abierta? La consume Órdenes de lavado para rechazar
 * registrar/editar una orden en una jornada que ya no está abierta.
 *
 * @param {number|string} id
 * @returns {Promise<boolean>}
 */
const jornadaEstaAbierta = async (id) => {
  const jornada = await obtenerJornadaPorId(id);
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
