import { useEffect, useRef, useState } from 'react';

/**
 * Muestra de un radio o una sombra del tema sobre una tarjeta de ejemplo.
 *
 * El valor se lee del estilo que el navegador aplica a la propia muestra, no
 * de una variable: Tailwind incrusta las sombras dentro de su utilidad, así
 * que esta es la única forma de mostrar lo que realmente se pinta.
 *
 * @param {object} props
 * @param {string} props.clase Clases literales que aplican el token, por ejemplo 'rounded-control'.
 * @param {string} props.nombre Nombre de la utilidad que se muestra como título.
 * @param {string} props.uso Para qué sirve el token.
 * @param {'borderRadius'|'boxShadow'} props.propiedad Propiedad CSS que se lee.
 */
export function MuestraDeForma({ clase, nombre, uso, propiedad }) {
  const muestra = useRef(null);
  const [valor, setValor] = useState('');

  useEffect(() => {
    setValor(getComputedStyle(muestra.current)[propiedad]);
  }, [propiedad]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={muestra} className={`h-16 border border-neutro-200 bg-white ${clase}`} />
      <div className="min-w-0">
        <p className="truncate font-mono text-meta text-neutro-700">{nombre}</p>
        <p className="text-meta text-neutro-600">{uso}</p>
        <p className="font-mono text-micro break-words text-neutro-500">{valor || '—'}</p>
      </div>
    </div>
  );
}
