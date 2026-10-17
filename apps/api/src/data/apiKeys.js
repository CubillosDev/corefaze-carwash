const { generarHash } = require('../utils/crypto.util');

/**
 * "Tabla" de API Keys en memoria (equivalente a la futura tabla `api_keys`
 * de Supabase, Bloque 10). Cada registro identifica UN cliente que consume
 * la API; nunca se guarda la llave original, solo su hash.
 *
 * `activa` permite revocar un cliente sin afectar a los demás.
 *
 * @param {{ postman: string, admin: string, movil: string }} claves
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
    Object.freeze({
      id: 2,
      cliente: 'Panel administrativo (web)',
      hash: generarHash(claves.admin),
      activa: true,
    }),
    Object.freeze({
      id: 3,
      cliente: 'Aplicación móvil',
      hash: generarHash(claves.movil),
      activa: true,
    }),
  ]);

module.exports = { construirRegistrosApiKeys };
