const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

// Restringir el algoritmo evita que un token manipulado le indique al
// servidor qué algoritmo usar para verificarse a sí mismo (Parte 5 del lab).
const ALGORITMO = 'HS256';

/**
 * Genera un JWT para un usuario autenticado. El payload lleva solo lo
 * necesario para identificar al usuario (email, rol); nunca password ni
 * passwordHash, aunque la firma no los oculte (no cifra, solo firma).
 *
 * `opciones.expiresIn` permite sobrescribir la expiración configurada
 * (útil para pruebas de expiración, sin depender de JWT_EXPIRES_IN global).
 *
 * @param {{ id: number, email: string, rol: string }} usuario
 * @param {{ expiresIn?: string }} [opciones]
 * @returns {string}
 */
const generarToken = (usuario, { expiresIn = env.jwt.expiresIn } = {}) => {
  const payload = { email: usuario.email, rol: usuario.rol };

  return jwt.sign(payload, env.jwt.secret, {
    algorithm: ALGORITMO,
    subject: String(usuario.id),
    expiresIn,
  });
};

/**
 * Verifica la firma y la expiración de un JWT.
 * Lanza (no captura) el error de jsonwebtoken si el token es inválido o
 * expiró; quien llame decide cómo traducirlo a una respuesta HTTP.
 *
 * @param {string} token
 * @returns {{ sub: string, email: string, rol: string, iat: number, exp: number }}
 */
const verificarToken = (token) => jwt.verify(token, env.jwt.secret, { algorithms: [ALGORITMO] });

module.exports = { generarToken, verificarToken };
