const crypto = require('node:crypto');

/**
 * Hash SHA-256 en hexadecimal. Se usa para NO almacenar la API Key original,
 * ni siquiera en memoria: solo su huella. Nunca se necesita revertir este hash.
 *
 * @param {string} valor
 * @returns {string}
 */
const generarHash = (valor) => crypto.createHash('sha256').update(valor).digest('hex');

/**
 * Compara dos valores en tiempo constante, para que un atacante no pueda
 * deducir por cuánto tardó la respuesta cuántos caracteres acertó.
 * Ambos deben tener la misma longitud en bytes o timingSafeEqual lanza error;
 * por eso se descarta antes esa posibilidad.
 *
 * @param {string} valorA
 * @param {string} valorB
 * @returns {boolean}
 */
const compararSeguro = (valorA, valorB) => {
  const bufferA = Buffer.from(valorA, 'utf8');
  const bufferB = Buffer.from(valorB, 'utf8');

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
};

module.exports = { generarHash, compararSeguro };
