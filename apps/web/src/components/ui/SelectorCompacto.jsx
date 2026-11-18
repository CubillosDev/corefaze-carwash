import { useId } from 'react';

import { IconoFlechaAbajo } from '@/components/ui/iconos/IconoFlechaAbajo';

/**
 * Lista desplegable pequeña con la etiqueta a la izquierda, como "Ordenar por"
 * en el listado de clientes del diseño. Para filtros y orden de listas; los
 * formularios usan CampoSeleccion.
 *
 * @param {object} props
 * @param {string} props.etiqueta
 * @param {{ valor: string|number, texto: string }[]} props.opciones
 * @param {string|number} props.valor
 * @param {(valor: string) => void} props.alCambiar
 */
export function SelectorCompacto({ etiqueta, opciones, valor, alCambiar }) {
  const id = useId();

  return (
    <div className="inline-flex items-center gap-2 text-detalle text-neutro-600">
      <label htmlFor={id} className="whitespace-nowrap">
        {etiqueta}
      </label>
      <span className="relative">
        <select
          id={id}
          value={valor}
          onChange={(evento) => alCambiar(evento.target.value)}
          className="h-8 cursor-pointer appearance-none rounded-control border border-neutro-300 bg-white pr-7 pl-2.5 text-detalle font-semibold text-neutro-900 outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-primario focus-visible:shadow-foco-campo"
        >
          {opciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.texto}
            </option>
          ))}
        </select>
        <IconoFlechaAbajo className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-neutro-600" />
      </span>
    </div>
  );
}
