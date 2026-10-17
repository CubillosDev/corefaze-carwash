const bcrypt = require('bcrypt');

// Factor de costo de bcrypt: cuántas rondas de hashing aplica.
// Más alto = más lento de calcular = más resistente a ataques de fuerza bruta,
// pero también más lento en cada registro/login legítimo. 12 es un valor estándar.
const RONDAS_SALT = 12;

/**
 * Genera el hash de una contraseña, con un salt aleatorio incluido.
 * Es asíncrona porque bcrypt hace un trabajo computacional deliberadamente
 * costoso; await evita bloquear el resto del servidor mientras se calcula.
 *
 * @param {string} password
 * @returns {Promise<string>} algo como "$2b$12$..."
 */
const generarPasswordHash = (password) => bcrypt.hash(password, RONDAS_SALT);

/**
 * Verifica una contraseña en texto plano contra un hash ya almacenado.
 * bcrypt extrae el salt del propio hash, así que no hace falta pasarlo aparte.
 *
 * @param {string} password
 * @param {string} passwordHash
 * @returns {Promise<boolean>}
 */
const verificarPassword = (password, passwordHash) => bcrypt.compare(password, passwordHash);

module.exports = { generarPasswordHash, verificarPassword };
