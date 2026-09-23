const { NoAutenticado, AccesoDenegado } = require('../utils/errores');

const NOMBRE_HEADER = 'X-API-Key';

/**
 * Crea el middleware que identifica al cliente que llama a la API.
 * Recibe el service (no las llaves) para no acoplarse a cómo se cargan:
 * en pruebas se le pasa un service con registros falsos.
 *
 * @param {{ buscarClientePorApiKey: (apiKey: string) => object | null }} servicioApiKeys
 */
const crearMiddlewareApiKey = (servicioApiKeys) => (req, _res, next) => {
  const apiKeyRecibida = req.get(NOMBRE_HEADER);

  if (!apiKeyRecibida) {
    return next(new NoAutenticado('API Key requerida'));
  }

  const cliente = servicioApiKeys.buscarClientePorApiKey(apiKeyRecibida);

  if (!cliente) {
    return next(new NoAutenticado('API Key inválida'));
  }

  if (!cliente.activa) {
    return next(new AccesoDenegado('API Key deshabilitada'));
  }

  // Disponible para el resto de la petición: routes, controllers y auditoría
  req.clienteApi = { id: cliente.id, nombre: cliente.cliente };
  return next();
};

module.exports = { crearMiddlewareApiKey };
