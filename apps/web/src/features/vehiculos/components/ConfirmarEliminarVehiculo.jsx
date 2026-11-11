import { useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { Modal } from '@/components/ui/Modal';
import { ErrorHttp } from '@/lib/httpCliente';
import { formatoPlaca } from '@/utils/formatoPlaca';

/**
 * Confirmación antes de eliminar un vehículo. La API rechaza con 409 los que
 * tienen órdenes de lavado: el mensaje se muestra aquí y la ventana queda
 * abierta para que la persona lo lea.
 *
 * Se monta solo mientras está abierta.
 *
 * @param {object} props
 * @param {{ placa: string }} props.vehiculo
 * @param {() => Promise<void>} props.alConfirmar Debe lanzar el error si la API rechaza.
 * @param {() => void} props.alCerrar
 */
export function ConfirmarEliminarVehiculo({ vehiculo, alConfirmar, alCerrar }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function confirmar() {
    setEnviando(true);
    setError('');
    try {
      await alConfirmar();
    } catch (fallo) {
      if (!(fallo instanceof ErrorHttp)) {
        throw fallo;
      }
      setError(fallo.message);
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      tamano="pequeno"
      titulo="Eliminar vehículo"
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton variante="peligro" onClick={confirmar} cargando={enviando}>
            Eliminar
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <Alerta tipo="error" titulo="No se pudo eliminar">
            {error}
          </Alerta>
        ) : null}
        <p>
          ¿Seguro que quieres eliminar el vehículo{' '}
          <strong className="font-mono">{formatoPlaca(vehiculo.placa)}</strong>? Esta acción no se
          puede deshacer.
        </p>
      </div>
    </Modal>
  );
}
