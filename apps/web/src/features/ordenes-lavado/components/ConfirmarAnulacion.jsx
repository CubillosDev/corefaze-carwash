import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { LIMITES } from '@/constants/dominio';
import { formatoPlaca } from '@/utils/formatoPlaca';

/**
 * Confirmación antes de anular (cancelar) una orden. El motivo es opcional y
 * se limita al máximo del contrato. Una orden anulada ya no se modifica (R10).
 *
 * @param {object} props
 * @param {{ placa: string, turno: number } | null} props.orden Orden a anular; null la cierra.
 * @param {boolean} props.enviando
 * @param {string} props.error Mensaje de la API si no se pudo anular.
 * @param {(motivo: string) => void} props.alConfirmar
 * @param {() => void} props.alCancelar
 */
export function ConfirmarAnulacion({ orden, enviando, error, alConfirmar, alCancelar }) {
  const [motivo, setMotivo] = useState('');
  const largo = motivo.trim().length > LIMITES.observaciones.max;

  return (
    <Modal
      abierto={orden !== null}
      alCerrar={alCancelar}
      tamano="pequeno"
      titulo={`Anular la orden de ${formatoPlaca(orden?.placa)}`}
      descripcion={orden ? `Turno ${orden.turno}` : undefined}
      pie={
        <>
          <Boton variante="secundario" tamano="grande" onClick={alCancelar}>
            Volver
          </Boton>
          <Boton
            variante="peligro"
            tamano="grande"
            cargando={enviando}
            disabled={largo}
            onClick={() => alConfirmar(motivo.trim())}
          >
            Anular orden
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p>
          La orden queda cancelada y no suma a los totales de la jornada. Después ya no se puede
          modificar.
        </p>
        {error ? (
          <Alerta tipo="error" titulo="No se pudo anular">
            {error}
          </Alerta>
        ) : null}
        <CampoTexto
          etiqueta="Motivo (opcional)"
          value={motivo}
          maxLength={LIMITES.observaciones.max}
          onChange={(evento) => setMotivo(evento.target.value)}
          error={largo ? `Máximo ${LIMITES.observaciones.max} caracteres.` : undefined}
        />
      </div>
    </Modal>
  );
}
