import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { formatoMoneda } from '@/utils/formatoMoneda';
import { formatoPlaca } from '@/utils/formatoPlaca';

const PATRON_VALE = /^[A-Z0-9-]{3,30}$/;

/**
 * Registra el vale de un servicio a crédito que se entregó sin él (por
 * ejemplo, desde el tablero en lugar de la caja). Sin vale no se puede pagar.
 *
 * @param {object} props
 * @param {object} props.orden
 * @param {boolean} props.enviando
 * @param {string} props.error
 * @param {(numero: string) => void} props.alGuardar
 * @param {() => void} props.alCerrar
 */
export function AgregarVale({ orden, enviando, error, alGuardar, alCerrar }) {
  const [numero, setNumero] = useState('');
  const valido = PATRON_VALE.test(numero.trim());

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo="Agregar vale"
      descripcion={`${formatoPlaca(orden.vehiculo?.placa)} · ${orden.servicio?.nombre} · ${formatoMoneda(orden.valor)}`}
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
            disabled={!valido}
            onClick={() => alGuardar(numero.trim())}
          >
            Guardar vale
          </Boton>
        </>
      }
    >
      <CampoTexto
        etiqueta="N.º de vale"
        variante="placa"
        placeholder="Ej. TA-1234"
        maxLength={30}
        value={numero}
        onChange={(evento) => setNumero(evento.target.value.toUpperCase())}
        ayuda="De 3 a 30 letras, números o guiones."
        requerido
      />
      {error ? (
        <Alerta tipo="error" className="mt-3">
          {error}
        </Alerta>
      ) : null}
    </Modal>
  );
}
