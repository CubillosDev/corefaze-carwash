import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { ETIQUETAS_MEDIO_PAGO_CREDITO } from '@/constants/etiquetas';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { plural } from '@/utils/plural';

/**
 * "Registrar pago" del diseño: paga completos los servicios con vale
 * verificado y guarda cómo pagó la empresa. El total definitivo lo calcula el
 * servidor con el valor de cada orden.
 *
 * @param {object} props
 * @param {object} props.empresa
 * @param {object[]} props.ordenes Servicios con vale verificado.
 * @param {number} props.pendientesSinVale Los que quedan en el saldo.
 * @param {boolean} props.enviando
 * @param {string} props.error
 * @param {(medio: string) => void} props.alConfirmar
 * @param {() => void} props.alCerrar
 */
export function RegistrarPago({ empresa, ordenes, pendientesSinVale, enviando, error, alConfirmar, alCerrar }) {
  const [medio, setMedio] = useState('transferencia');
  const total = ordenes.reduce((suma, orden) => suma + orden.valor, 0);

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo="Registrar pago"
      descripcion={empresa.nombre}
      tamano="pequeno"
      pie={
        <>
          <Boton variante="secundario" tamano="grande" className="flex-1" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton tamano="grande" className="flex-1" cargando={enviando} onClick={() => alConfirmar(medio)}>
            Confirmar pago
          </Boton>
        </>
      }
    >
      <div className="flex items-baseline justify-between">
        <span className="text-control font-semibold">{plural(ordenes.length, 'vale verificado', 'vales verificados')}</span>
        <span className="text-indicador tabular-nums">{formatoMoneda(total)}</span>
      </div>

      <p className="mt-4 mb-1.5 text-meta font-semibold text-neutro-700">Forma de pago</p>
      <div role="group" aria-label="Forma de pago" className="grid grid-cols-3 gap-1.5">
        {Object.entries(ETIQUETAS_MEDIO_PAGO_CREDITO).map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            aria-pressed={medio === valor}
            onClick={() => setMedio(valor)}
            className={`h-10 rounded-bloque border-[1.5px] text-control font-semibold transition-colors duration-150 ${
              medio === valor ? 'border-primario bg-primario-25 text-primario' : 'border-neutro-275 bg-white text-neutro-700'
            }`}
          >
            {texto}
          </button>
        ))}
      </div>

      <p className="mt-3 rounded-bloque bg-neutro-75 px-3 py-2.75 text-detalle leading-apoyo text-neutro-700">
        {pendientesSinVale > 0
          ? `Quedarán ${plural(pendientesSinVale, 'servicio pendiente', 'servicios pendientes')} sin vale verificado. Se mantienen en el saldo de la empresa.`
          : 'Con este pago la empresa queda al día.'}
      </p>

      {error ? (
        <Alerta tipo="error" className="mt-3">
          {error}
        </Alerta>
      ) : null}
    </Modal>
  );
}
