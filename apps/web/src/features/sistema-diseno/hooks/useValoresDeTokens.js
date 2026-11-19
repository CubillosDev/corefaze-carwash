import { useEffect, useState } from 'react';

/**
 * Lee de una sola vez el valor de varias variables CSS del tema.
 *
 * getComputedStyle obliga al navegador a resolver los estilos, así que el
 * catálogo hace una única lectura para todas las muestras en lugar de una por
 * muestra.
 *
 * `variables` entra en las dependencias del efecto: debe ser una referencia
 * estable (una constante de módulo), no un arreglo creado en cada render.
 *
 * @param {string[]} variables Nombres completos, por ejemplo '--radius-control'.
 * @returns {Record<string, string>} Variable a valor; vacío en el primer render.
 */
export function useValoresDeTokens(variables) {
  const [valores, setValores] = useState({});

  useEffect(() => {
    const estilos = getComputedStyle(document.documentElement);
    const leidos = {};

    for (const variable of variables) {
      leidos[variable] = estilos.getPropertyValue(variable).trim();
    }

    setValores(leidos);
  }, [variables]);

  return valores;
}
