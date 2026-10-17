import { useEffect, useState } from 'react';

/**
 * Lee de una sola vez el valor de varios tokens de color del tema.
 *
 * getComputedStyle obliga al navegador a resolver los estilos, así que el
 * catálogo hace una única lectura para todas las muestras en lugar de una por
 * muestra.
 *
 * `tokens` entra en las dependencias del efecto: debe ser una referencia
 * estable (una constante de módulo), no un arreglo creado en cada render.
 *
 * @param {string[]} tokens Nombres sin el prefijo, por ejemplo 'primario-500'.
 * @returns {Record<string, string>} Token a valor; vacío en el primer render.
 */
export function useValoresDeColor(tokens) {
  const [valores, setValores] = useState({});

  useEffect(() => {
    const estilos = getComputedStyle(document.documentElement);
    const leidos = {};

    for (const token of tokens) {
      leidos[token] = estilos.getPropertyValue(`--color-${token}`).trim();
    }

    setValores(leidos);
  }, [tokens]);

  return valores;
}
