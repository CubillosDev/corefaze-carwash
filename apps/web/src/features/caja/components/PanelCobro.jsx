import { Boton } from '@/components/ui/Boton';
import { IconoVisto } from '@/components/ui/iconos/IconoVisto';
import { etiquetaMedioPago } from '@/constants/etiquetas';
import { FormularioCobro } from '@/features/caja/components/FormularioCobro';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';

function SinSeleccion({ titulo, descripcion }) {
  return (
    <div className="px-5.5 py-12 text-center">
      <p className="text-saludo">{titulo}</p>
      <p className="mt-1 text-detalle leading-apoyo text-neutro-450">{descripcion}</p>
    </div>
  );
}

function CobroRegistrado({ cobro, hayMas, alSiguiente, alImprimir }) {
  return (
    <div className="px-5 pt-7.5 pb-5 text-center" role="status">
      <span className="mx-auto flex size-13 items-center justify-center rounded-full bg-neutro-900 text-white">
        <IconoVisto className="size-6" />
      </span>
      <p className="mt-3.5 text-titulo-modal">Cobro registrado</p>
      <p className="mt-0.75 text-detalle text-neutro-600">
        {formatoPlaca(cobro.orden?.vehiculo?.placa)} · {formatoMoneda(cobro.valor)} · {etiquetaMedioPago(cobro.medioPago)}
      </p>
      {cobro.cambio ? (
        <div className="mt-4 rounded-menu bg-neutro-75 p-3">
          <p className="text-meta text-neutro-600">Entrega de cambio</p>
          <p className="text-cifra tabular-nums">{formatoMoneda(cobro.cambio)}</p>
        </div>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Boton variante="secundario" tamano="grande" className="flex-1" onClick={() => alImprimir(cobro)}>
          Imprimir
        </Boton>
        <Boton tamano="grande" className="flex-1" onClick={alSiguiente}>
          {hayMas ? 'Siguiente vehículo' : 'Listo'}
        </Boton>
      </div>
    </div>
  );
}

/**
 * Panel derecho de la caja (diseño: "Cobrando"): no muestra nada hasta que se
 * elige un vehículo; luego el cobro, y al terminar la confirmación. No hay
 * "Deshacer": una orden entregada no vuelve atrás (R10).
 *
 * @param {object} props
 * @param {boolean} props.cajaAbierta
 * @param {boolean} props.hayPorCobrar
 * @param {object|null} props.orden La orden elegida.
 * @param {object|null} props.cobroHecho El último cobro registrado.
 * @param {object[]} props.empresas
 * @param {object|null} props.negocio
 * @param {boolean} props.enviando
 * @param {string} props.error
 * @param {(cobro: object) => void} props.alCobrar
 * @param {() => void} props.alSiguiente
 * @param {(cobro: object) => void} props.alImprimir
 */
export function PanelCobro({
  cajaAbierta,
  hayPorCobrar,
  orden,
  cobroHecho,
  empresas,
  negocio,
  enviando,
  error,
  alCobrar,
  alSiguiente,
  alImprimir,
}) {
  let contenido;
  if (cobroHecho) {
    contenido = (
      <CobroRegistrado cobro={cobroHecho} hayMas={hayPorCobrar} alSiguiente={alSiguiente} alImprimir={alImprimir} />
    );
  } else if (!cajaAbierta) {
    contenido = <SinSeleccion titulo="La caja está cerrada" descripcion="Ábrela para volver a registrar cobros." />;
  } else if (!orden) {
    contenido = hayPorCobrar ? (
      <SinSeleccion
        titulo="Selecciona un vehículo"
        descripcion="Elige un vehículo de la lista para ver el total y el comprobante."
      />
    ) : (
      <SinSeleccion
        titulo="Todo cobrado"
        descripcion="Cuando un vehículo termine en el tablero, aparecerá aquí para cobrarlo."
      />
    );
  } else {
    contenido = (
      <FormularioCobro
        key={orden.id}
        orden={orden}
        empresas={empresas}
        negocio={negocio}
        enviando={enviando}
        error={error}
        alCobrar={alCobrar}
      />
    );
  }

  return (
    <aside
      aria-label="Cobro"
      className="min-w-0 overflow-x-hidden rounded-tarjeta border border-neutro-200 bg-white amplio:max-h-full amplio:w-85 amplio:shrink-0 amplio:overflow-y-auto"
    >
      {contenido}
    </aside>
  );
}
