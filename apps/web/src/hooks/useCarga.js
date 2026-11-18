import { useCallback, useEffect, useState } from 'react';

const MENSAJE_POR_DEFECTO = 'No pudimos cargar la información. Inténtalo de nuevo.';

/**
 * Carga datos de la API al montar y cada vez que se pide `recargar`, con los
 * tres estados de toda pantalla con datos: cargando, listo y error. Cancela la
 * solicitud si el componente se desmonta o si se vuelve a cargar.
 *
 * `cargar` debe ser estable (una función del módulo o envuelta en useCallback):
 * cuando cambia (por ejemplo, otra jornada), se vuelve a cargar y mientras
 * tanto la situación es "cargando", para no mostrar datos de la consulta
 * anterior.
 *
 * @template T
 * @param {(signal: AbortSignal) => Promise<T>} cargar
 * @returns {{
 *   situacion: 'cargando'|'listo'|'error',
 *   datos: T|null,
 *   error: string,
 *   recargar: () => void,
 *   actualizar: (cambio: (datos: T) => T) => void,
 * }}
 */
export function useCarga(cargar) {
  const [estado, setEstado] = useState({ origen: null, situacion: 'cargando', datos: null, error: '' });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controlador = new AbortController();
    const { signal } = controlador;

    cargar(signal).then(
      (datos) => setEstado({ origen: cargar, situacion: 'listo', datos, error: '' }),
      (error) => {
        if (!signal.aborted) {
          setEstado((anterior) => ({
            ...anterior,
            origen: cargar,
            situacion: 'error',
            error: error?.message || MENSAJE_POR_DEFECTO,
          }));
        }
      },
    );

    return () => controlador.abort();
  }, [cargar, intento]);

  const recargar = useCallback(() => {
    setEstado((anterior) => ({ ...anterior, situacion: 'cargando', error: '' }));
    setIntento((valor) => valor + 1);
  }, []);

  const actualizar = useCallback((cambio) => {
    setEstado((anterior) =>
      anterior.datos === null ? anterior : { ...anterior, datos: cambio(anterior.datos) },
    );
  }, []);

  const vigente = estado.origen === cargar;

  return {
    situacion: vigente ? estado.situacion : 'cargando',
    datos: estado.datos,
    error: vigente ? estado.error : '',
    recargar,
    actualizar,
  };
}
