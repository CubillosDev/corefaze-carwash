const { generarHash } = require('../utils/crypto.util');

/**
 * "Tabla" de API Keys en memoria (equivalente a la futura tabla `api_keys`
 * de Supabase, Bloque 10). Cada registro identifica UN cliente que consume
 * la API; nunca se guarda la llave original, solo su hash.
 *
 * `activa` permite revocar un cliente sin afectar a los demás.
 *
 * @param {{ postman: string, admin: string, movil: string, web: string }} claves
 * @returns {Array<{ id: number, cliente: string, hash: string, activa: boolean }>}
 */
const construirRegistrosApiKeys = (claves) =>
  Object.freeze([
    Object.freeze({
      id: 1,
      cliente: 'Postman / Laboratorio',
      hash: generarHash(claves.postman),
      activa: true,
    }),
    // Antes se llamaba 'Panel administrativo (web)', pero esa llave nunca
    // fue del panel web en la práctica: el panel web usa su propia llave
    // (API_KEY_WEB, registro id 4) desde SCRUM-140. No se encontró ningún
    // otro consumidor documentado de API_KEY_ADMIN en el repo, así que el
    // label queda genérico hasta que se identifique su uso real.
    Object.freeze({
      id: 2,
      cliente: 'Administración',
      hash: generarHash(claves.admin),
      activa: true,
    }),
    Object.freeze({
      id: 3,
      cliente: 'Aplicación móvil',
      hash: generarHash(claves.movil),
      activa: true,
    }),
    Object.freeze({
      id: 4,
      cliente: 'Panel web',
      hash: generarHash(claves.web),
      activa: true,
    }),
  ]);

module.exports = { construirRegistrosApiKeys };
