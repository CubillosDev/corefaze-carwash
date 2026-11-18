import { useId } from 'react';

import { Avatar } from '@/components/ui/Avatar';

/**
 * Píldoras para elegir el colaborador de la orden, con su código, como los
 * operadores del diseño. Solo recibe colaboradores activos (R2 lo valida la API).
 *
 * @param {object} props
 * @param {{ id: number, codigo: number, nombre: string }[]} props.colaboradores
 * @param {number|null} props.valor
 * @param {(id: number) => void} props.alCambiar
 * @param {string} [props.error]
 */
export function SelectorColaborador({ colaboradores, valor, alCambiar, error }) {
  const idTitulo = useId();

  return (
    <div className="mt-4.5">
      <span id={idTitulo} className="text-meta font-semibold text-neutro-700">
        Colaborador
      </span>
      <div role="radiogroup" aria-labelledby={idTitulo} className="mt-1.5 flex flex-wrap gap-1.5">
        {colaboradores.map((colaborador) => {
          const elegido = colaborador.id === valor;
          return (
            <button
              key={colaborador.id}
              type="button"
              role="radio"
              aria-checked={elegido}
              onClick={() => alCambiar(colaborador.id)}
              className={`inline-flex h-8 items-center gap-1.75 rounded-full border pr-2.75 pl-1 text-detalle font-medium transition-colors duration-150 ${
                elegido
                  ? 'border-primario bg-primario-50 text-primario-800'
                  : 'border-neutro-275 bg-white text-neutro-700 hover:border-neutro-300'
              }`}
            >
              <Avatar nombre={String(colaborador.codigo)} textoLiteral tamano="compacto" tono="neutro" />
              {colaborador.nombre}
            </button>
          );
        })}
      </div>
      {error ? <p className="mt-1.5 text-meta font-medium text-error">{error}</p> : null}
    </div>
  );
}
