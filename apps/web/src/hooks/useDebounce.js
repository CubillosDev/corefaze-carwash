import { useEffect, useState } from 'react';

/**
 * Devuelve `valor` cuando lleva `espera` milisegundos sin cambiar. Sirve para
 * no pedirle a la API una búsqueda por cada tecla.
 *
 * @template T
 * @param {T} valor
 * @param {number} [espera]
 * @returns {T}
 */
export function useDebounce(valor, espera = 300) {
  const [estable, setEstable] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setEstable(valor), espera);
    return () => clearTimeout(temporizador);
  }, [valor, espera]);

  return estable;
}
