/**
 * Conversión de llaves entre la base de datos (snake_case) y el JSON de la API
 * (camelCase). Solo cambia las LLAVES: los valores (por ejemplo 'en_proceso')
 * se dejan intactos. La usan únicamente los services.
 */

const esObjetoPlano = (valor) => Object.prototype.toString.call(valor) === '[object Object]';

const llaveACamelCase = (llave) => llave.replace(/_([a-z])/g, (_, letra) => letra.toUpperCase());

const llaveASnakeCase = (llave) => llave.replace(/[A-Z]/g, (letra) => `_${letra.toLowerCase()}`);

/**
 * Recorre objetos y arreglos (incluso anidados) y devuelve una copia con las
 * llaves transformadas. Fechas, null y valores simples pasan sin cambios.
 */
const transformarLlaves = (valor, transformarLlave) => {
  if (Array.isArray(valor)) {
    return valor.map((elemento) => transformarLlaves(elemento, transformarLlave));
  }

  if (esObjetoPlano(valor)) {
    return Object.fromEntries(
      Object.entries(valor).map(([llave, contenido]) => [
        transformarLlave(llave),
        transformarLlaves(contenido, transformarLlave),
      ]),
    );
  }

  return valor;
};

/** { tipo_vehiculo: 'automovil' } → { tipoVehiculo: 'automovil' } */
const aCamelCase = (datos) => transformarLlaves(datos, llaveACamelCase);

/** { tipoVehiculo: 'automovil' } → { tipo_vehiculo: 'automovil' } */
const aSnakeCase = (datos) => transformarLlaves(datos, llaveASnakeCase);

module.exports = { aCamelCase, aSnakeCase };
