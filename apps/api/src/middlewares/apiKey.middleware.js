const crypto = require('node:crypto');
const { NoAutenticado } = require('../utils/errores');

const NOMBRE_HEADER = 'X-API-Key';

const calcularHuella = (texto) => crypto.createHash('sha256').update(texto).digest();

/**
 * Compara en tiempo constante para no filtrar, por diferencias de milisegundos,
 * cuántos caracteres de la llave se acertaron. Se comparan las huellas SHA-256
 * porque timingSafeEqual exige buffers de igual longitud.
 */
const llavesCoinciden = (recibida, esperada) =>
  crypto.timingSafeEqual(calcularHuella(recibida), calcularHuella(esperada));

/**
 * Crea el middleware que exige la API Key en el header X-API-Key.
 * Recibe la llave esperada como parámetro en lugar de leer env aquí: se prueba
 * con cualquier llave y luego será fácil aceptar una lista (web y móvil).
 *
 * @param {string} apiKeyEsperada
 */
const crearMiddlewareApiKey = (apiKeyEsperada) => {
  if (!apiKeyEsperada) {
    throw new Error('crearMiddlewareApiKey requiere una API Key no vacía');
  }

  return (req, _res, next) => {
    const apiKeyRecibida = req.get(NOMBRE_HEADER);

    if (!apiKeyRecibida || !llavesCoinciden(apiKeyRecibida, apiKeyEsperada)) {
      return next(new NoAutenticado());
    }
    return next();
  };
};

module.exports = { crearMiddlewareApiKey };
