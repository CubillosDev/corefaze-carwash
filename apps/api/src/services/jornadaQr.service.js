const crypto = require('node:crypto');
const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const jornadasService = require('./jornadas.service');
const { generarHash } = require('../utils/crypto.util');
const { Conflicto } = require('../utils/errores');

/** Lo que dura un QR en pantalla antes de renovarse (diseño: 30 s). */
const VIGENCIA_SEGUNDOS = 30;

/**
 * Contenido del QR: un esquema propio para que la app móvil lo reconozca y
 * no lo confunda con un enlace web.
 */
const PREFIJO_QR = 'corefaze-jornada:';

/**
 * Genera un token de un solo uso para abrir la jornada desde la app móvil.
 * Solo se guarda su SHA-256; el token sale una sola vez, en esta respuesta.
 *
 * @param {number} usuarioId Quien muestra el QR.
 * @returns {Promise<{ contenido: string, expiraEn: string, vigenciaSegundos: number }>}
 */
const generarToken = async (usuarioId) => {
  const token = crypto.randomBytes(24).toString('base64url');
  const expiraEn = new Date(Date.now() + VIGENCIA_SEGUNDOS * 1000).toISOString();

  const { error } = await crearClienteConUsuario(usuarioId)
    .from('tokens_jornada')
    .insert({ token_hash: generarHash(token), creado_por: usuarioId, expira_en: expiraEn });

  if (error) {
    throw new Error(`No se pudo generar el QR de la jornada: ${error.message}`);
  }

  return { contenido: `${PREFIJO_QR}${token}`, expiraEn, vigenciaSegundos: VIGENCIA_SEGUNDOS };
};

/**
 * Canjea el token leído del QR y abre la jornada del día a nombre de quien
 * lo leyó. El token se marca usado en una sola sentencia condicionada (sin
 * usar y sin vencer), así que dos lecturas simultáneas no abren dos veces.
 *
 * @param {string} contenido Lo leído del QR (con o sin el prefijo).
 * @param {number} usuarioId Quien lee el QR desde la app móvil.
 * @throws {Conflicto} si el QR venció, ya se usó o no existe, o si ya hay jornada.
 */
const canjearToken = async (contenido, usuarioId) => {
  const token = contenido.startsWith(PREFIJO_QR) ? contenido.slice(PREFIJO_QR.length) : contenido;

  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('tokens_jornada')
    .update({ usado_en: new Date().toISOString(), usado_por: usuarioId })
    .eq('token_hash', generarHash(token))
    .is('usado_en', null)
    .gt('expira_en', new Date().toISOString())
    .select('id');

  if (error) {
    throw new Error(`No se pudo validar el QR de la jornada: ${error.message}`);
  }
  if (data.length === 0) {
    throw new Conflicto('El código QR venció o ya se usó: genera uno nuevo en el panel');
  }

  let jornada;
  try {
    jornada = await jornadasService.abrirJornada(usuarioId);
  } catch (errorAlAbrir) {
    // Si la jornada no se pudo abrir (ya hay una abierta, o hoy ya tuvo
    // jornada), el código no se gasta: se libera para reintentar mientras
    // siga vigente.
    await crearClienteConUsuario(usuarioId)
      .from('tokens_jornada')
      .update({ usado_en: null, usado_por: null })
      .eq('id', data[0].id);
    throw errorAlAbrir;
  }

  await supabase.from('tokens_jornada').update({ jornada_id: jornada.id }).eq('id', data[0].id);

  return jornada;
};

module.exports = { VIGENCIA_SEGUNDOS, PREFIJO_QR, generarToken, canjearToken };
