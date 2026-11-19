/**
 * Sello aleatorio de `longitud` dígitos en base 10, con cero a la
 * izquierda (p. ej. longitud 6 -> "003482"). Se genera UNA VEZ por
 * archivo de prueba (o una vez por cada "familia" de valores que deba
 * compartirlo, como el documento de un cliente y el de un colaborador
 * dentro del mismo archivo): un contador o sello GLOBAL compartido entre
 * archivos no funciona, porque Jest corre cada archivo de prueba en un
 * proceso/worker distinto.
 *
 * @param {number} [longitud] cantidad de dígitos del sello (por defecto 6)
 * @returns {string}
 */
const generarSello = (longitud = 6) =>
  Math.floor(Math.random() * 10 ** longitud)
    .toString()
    .padStart(longitud, '0');

/**
 * Generador de valores únicos con su propio contador (arranca en 1, no
 * en 0). Cada llamada devuelve `formatear(sello, contador, ...args)`,
 * reenviando cualquier argumento extra que el propio `formatear`
 * necesite. Recibe el sello ya calculado (no lo genera él mismo) para
 * poder reusar el MISMO sello en más de un generador del mismo archivo
 * (p. ej. el documento de un cliente y el de un colaborador, que en
 * algunos archivos comparten sello y solo difieren en el contador y un
 * sufijo).
 *
 * @param {string|number} sello
 * @param {(sello: string|number, contador: number, ...args: any[]) => string|number} formatear
 * @returns {(...args: any[]) => string|number}
 */
const crearGeneradorDeValorUnico = (sello, formatear) => {
  let contador = 0;
  return (...args) => {
    contador += 1;
    return formatear(sello, contador, ...args);
  };
};

module.exports = { generarSello, crearGeneradorDeValorUnico };
