import { useState } from 'react';

import { CampoBusqueda } from '@/components/ui/CampoBusqueda';
import { iniciales } from '@/utils/iniciales';
import { fechaEnBogota, formatoFecha } from '@/utils/formatoFecha';
import { proximoCorte } from '@/utils/fechaCorte';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { plural } from '@/utils/plural';

/** Desde este uso del cupo la barra se pone en ámbar, como en el diseño. */
const USO_DE_ALERTA = 0.9;

const minusculas = (texto) => String(texto ?? '').toLocaleLowerCase('es-CO');

function TarjetaEmpresa({ empresa, elegida, alElegir }) {
  const uso = empresa.cupoCredito ? empresa.saldoPendiente / empresa.cupoCredito : null;

  return (
    <button
      type="button"
      aria-pressed={elegida}
      onClick={() => alElegir(empresa.id)}
      className={`flex flex-col gap-2.25 rounded-menu border-[1.5px] px-3.5 py-3.25 text-left transition-colors duration-150 ${
        elegida ? 'border-primario bg-primario-25' : 'border-neutro-200 bg-white hover:bg-neutro-25'
      }`}
    >
      <span className="flex w-full items-center gap-2.5">
        <span className="inline-flex size-8.5 shrink-0 items-center justify-center rounded-bloque bg-neutro-100 text-meta font-bold">
          {iniciales(empresa.nombre)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-cuerpo font-semibold">{empresa.nombre}</span>
          <span className="block text-nota text-neutro-450">
            {plural(empresa.cantidadOrdenesPagables, 'servicio por pagar', 'servicios por pagar')}
          </span>
        </span>
        <span className="text-cuerpo font-semibold whitespace-nowrap tabular-nums">
          {formatoMoneda(empresa.saldoPendiente)}
        </span>
      </span>
      {uso !== null ? (
        <span className="block h-1 w-full overflow-hidden rounded-full bg-neutro-150" aria-hidden="true">
          <span
            className={`block h-full rounded-full ${uso >= USO_DE_ALERTA ? 'bg-advertencia-fuerte' : 'bg-primario'}`}
            style={{ width: `${Math.min(100, Math.round(uso * 100))}%` }}
          />
        </span>
      ) : null}
      <span className="flex w-full justify-between gap-2 text-nota text-neutro-600">
        <span>
          {uso !== null
            ? `${Math.round(uso * 100)} % del cupo de ${formatoMoneda(empresa.cupoCredito)}`
            : 'Sin cupo definido'}
        </span>
        {empresa.diaCorte ? (
          <span className="text-neutro-450">Corte {formatoFecha(proximoCorte(empresa.diaCorte, fechaEnBogota()))}</span>
        ) : null}
      </span>
    </button>
  );
}

/**
 * Lista de empresas con crédito del diseño: buscador por nombre o NIT y una
 * tarjeta por empresa con su saldo, el uso del cupo y el próximo corte.
 *
 * @param {object} props
 * @param {import('@/features/credito/api/credito.api').EmpresaCredito[]} props.empresas
 * @param {number|null} props.elegidaId
 * @param {(id: number) => void} props.alElegir
 */
export function ListaEmpresas({ empresas, elegidaId, alElegir }) {
  const [busqueda, setBusqueda] = useState('');
  const texto = minusculas(busqueda.trim());
  const visibles = empresas.filter(
    (empresa) => texto === '' || minusculas(empresa.nombre).includes(texto) || empresa.documento.includes(texto),
  );

  return (
    <div className="flex min-w-0 flex-col gap-2 amplio:min-h-0 amplio:w-75 amplio:shrink-0">
      <CampoBusqueda etiqueta="Buscar empresas" marcador="Buscar empresa o NIT" valor={busqueda} alCambiar={setBusqueda} />
      <div className="flex flex-col gap-2 amplio:min-h-0 amplio:overflow-y-auto amplio:pb-1">
        {visibles.length === 0 ? (
          <p className="rounded-menu border border-dashed border-neutro-325 px-4 py-6 text-center text-detalle text-neutro-450">
            Ninguna empresa coincide.
          </p>
        ) : (
          visibles.map((empresa) => (
            <TarjetaEmpresa key={empresa.id} empresa={empresa} elegida={empresa.id === elegidaId} alElegir={alElegir} />
          ))
        )}
      </div>
    </div>
  );
}
