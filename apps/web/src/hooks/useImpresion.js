import { useEffect, useState } from 'react';

/**
 * Imprime un elemento a la vez: guarda qué se va a imprimir, deja que React
 * lo dibuje en la zona de impresión y abre el diálogo del navegador. Al
 * terminar (afterprint) lo olvida. La hoja de estilos de impresión de
 * global.css solo deja visible lo marcado con data-impresion.
 *
 * @template T
 * @returns {{ aImprimir: T|null, imprimir: (elemento: T) => void }}
 */
export function useImpresion() {
  const [aImprimir, setAImprimir] = useState(null);

  useEffect(() => {
    if (!aImprimir) {
      return undefined;
    }
    const terminar = () => setAImprimir(null);
    window.addEventListener('afterprint', terminar);
    const espera = window.setTimeout(() => window.print(), 0);
    return () => {
      window.clearTimeout(espera);
      window.removeEventListener('afterprint', terminar);
    };
  }, [aImprimir]);

  return { aImprimir, imprimir: setAImprimir };
}
