const { generarHash, compararSeguro } = require('../utils/crypto.util');

/**
 * Construye el service de API Keys a partir de los registros ya cargados.
 * Recibirlos como parámetro (en lugar de leerlos aquí) permite probar el
 * service con registros de prueba, sin depender de variables de entorno.
 *
 * @param {Array<{ id: number, cliente: string, hash: string, activa: boolean }>} registros
 */
const crearServicioApiKeys = (registros) => {
  /**
   * Busca qué cliente corresponde a una API Key recibida.
   * Nunca se compara la llave en texto plano: se hashea la recibida y se
   * compara ese hash, en tiempo constante, contra cada hash almacenado.
   *
   * @param {string} apiKey
   * @returns {{ id: number, cliente: string, activa: boolean } | null}
   */
  const buscarClientePorApiKey = (apiKey) => {
    const hashRecibido = generarHash(apiKey);

    const registro = registros.find((candidato) => compararSeguro(hashRecibido, candidato.hash));

    if (!registro) {
      return null;
    }

    // No se expone el hash almacenado hacia afuera del service
    return { id: registro.id, cliente: registro.cliente, activa: registro.activa };
  };

  return { buscarClientePorApiKey };
};

module.exports = { crearServicioApiKeys };
