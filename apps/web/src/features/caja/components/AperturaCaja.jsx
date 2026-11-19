import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoMonto } from '@/components/ui/CampoMonto';
import { Modal } from '@/components/ui/Modal';

const BASE_SUGERIDA = 100000;

/**
 * Abre la caja de la jornada con su base en efectivo (el diseño arranca con
 * $ 100.000; aquí se puede cambiar).
 *
 * @param {object} props
 * @param {boolean} props.enviando
 * @param {string} props.error
 * @param {(baseInicial: number) => void} props.alConfirmar
 * @param {() => void} props.alCerrar
 */
export function AperturaCaja({ enviando, error, alConfirmar, alCerrar }) {
  const [base, setBase] = useState(BASE_SUGERIDA);

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo="Abrir caja"
      descripcion="La base es el efectivo con que arranca la caja de la jornada."
      tamano="pequeno"
      pie={
        <>
          <Boton variante="secundario" tamano="grande" className="flex-1" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton
            tamano="grande"
            className="flex-1"
            cargando={enviando}
            disabled={base === null || enviando}
            onClick={() => alConfirmar(base)}
          >
            Abrir caja
          </Boton>
        </>
      }
    >
      <CampoMonto etiqueta="Base inicial" valor={base} alCambiar={setBase} requerido />
      {error ? (
        <Alerta tipo="error" className="mt-3">
          {error}
        </Alerta>
      ) : null}
    </Modal>
  );
}
