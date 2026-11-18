import { useId, useState } from 'react';

import { CampoBusqueda } from '@/components/ui/CampoBusqueda';
import { ControlSegmentado } from '@/components/ui/ControlSegmentado';
import { EstadoVacio } from '@/components/ui/EstadoVacio';
import { IconoVisto } from '@/components/ui/iconos/IconoVisto';
import { etiquetaCategoria } from '@/constants/etiquetas';

const TODAS = 'todas';

/** Texto sin tildes y en minúsculas, para buscar "basico" y encontrar "Básico". */
const paraBuscar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Lista de servicios activos para elegir uno, con pestañas por categoría y
 * búsqueda por nombre o número, como en el diseño. No muestra precios: el
 * valor de la orden lo calcula el servidor (R4).
 *
 * @param {object} props
 * @param {{ id: number, numero: number, nombre: string, descripcion: string|null, categoria: string|null }[]} props.servicios
 * @param {number|null} props.valor
 * @param {(id: number) => void} props.alCambiar
 * @param {string} [props.error]
 */
export function SelectorServicio({ servicios, valor, alCambiar, error }) {
  const idTitulo = useId();
  const [categoria, setCategoria] = useState(TODAS);
  const [busqueda, setBusqueda] = useState('');

  const categorias = [...new Set(servicios.map((servicio) => etiquetaCategoria(servicio.categoria)))];
  const texto = paraBuscar(busqueda.trim());
  const visibles = servicios.filter(
    (servicio) =>
      (categoria === TODAS || etiquetaCategoria(servicio.categoria) === categoria) &&
      (texto === '' || paraBuscar(servicio.nombre).includes(texto) || String(servicio.numero) === texto),
  );

  return (
    <div className="mt-4.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <span id={idTitulo} className="text-meta font-semibold text-neutro-700">
          Servicio
        </span>
        {categorias.length > 1 ? (
          <ControlSegmentado
            etiqueta="Categoría"
            tamano="compacto"
            opciones={[{ valor: TODAS, texto: 'Todas' }, ...categorias.map((nombre) => ({ valor: nombre, texto: nombre }))]}
            valor={categoria}
            alCambiar={setCategoria}
          />
        ) : null}
      </div>

      <CampoBusqueda
        etiqueta="Buscar servicio"
        variante="suave"
        marcador="Buscar por nombre o número"
        valor={busqueda}
        alCambiar={setBusqueda}
        className="mt-2"
      />

      <div
        role="radiogroup"
        aria-labelledby={idTitulo}
        aria-invalid={error ? true : undefined}
        className="mt-2 flex max-h-67 flex-col gap-1.5 overflow-y-auto pr-0.5"
      >
        {visibles.map((servicio) => {
          const elegido = servicio.id === valor;
          return (
            <button
              key={servicio.id}
              type="button"
              role="radio"
              aria-checked={elegido}
              onClick={() => alCambiar(servicio.id)}
              className={`flex min-h-12.5 items-center gap-2.75 rounded-bloque border py-2 pr-3 pl-2 text-left text-neutro-900 transition-colors duration-150 ${
                elegido ? 'border-primario bg-primario-50' : 'border-neutro-225 bg-white hover:border-neutro-300'
              }`}
            >
              <span
                className={`inline-flex size-7 shrink-0 items-center justify-center rounded-opcion text-meta font-bold text-white transition-colors duration-150 ${
                  elegido ? 'bg-primario' : 'bg-primario-800'
                }`}
              >
                {servicio.numero}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-control font-semibold">{servicio.nombre}</span>
                {servicio.descripcion ? (
                  <span className="mt-px block text-nota text-neutro-550">{servicio.descripcion}</span>
                ) : null}
              </span>
              <span
                aria-hidden="true"
                className={`inline-flex size-4.5 shrink-0 items-center justify-center rounded-full border-[1.5px] text-white transition-colors duration-150 ${
                  elegido ? 'border-primario bg-primario' : 'border-neutro-350 bg-white'
                }`}
              >
                <IconoVisto className="size-2.5" />
              </span>
            </button>
          );
        })}
        {visibles.length === 0 ? <EstadoVacio variante="punteado" titulo="Ningún servicio coincide" /> : null}
      </div>
      {error ? <p className="mt-1.5 text-meta font-medium text-error">{error}</p> : null}
    </div>
  );
}
