import { useId, useState } from 'react';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoSeleccion } from '@/components/ui/CampoSeleccion';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { TIPOS_VEHICULO } from '@/constants/dominio';
import { ETIQUETAS_TIPO_VEHICULO } from '@/constants/etiquetas';
import {
  normalizarPlaca,
  validarVehiculo,
} from '@/features/vehiculos/validators/vehiculo.schema';
import { ErrorHttp } from '@/lib/httpCliente';
import { formatoPlaca } from '@/utils/formatoPlaca';

const OPCIONES_TIPO = Object.values(TIPOS_VEHICULO).map((valor) => ({
  valor,
  texto: ETIQUETAS_TIPO_VEHICULO[valor],
}));

const LARGO_PLACA = 6;

function valoresIniciales(vehiculo) {
  return {
    placa: vehiculo?.placa ?? '',
    tipoVehiculo: vehiculo?.tipoVehiculo ?? '',
    marca: vehiculo?.marca ?? '',
    color: vehiculo?.color ?? '',
    clienteId: vehiculo ? String(vehiculo.clienteId) : '',
  };
}

/**
 * Ventana para registrar o editar un vehículo.
 *
 * Valida lo básico en el navegador como ayuda; la API vuelve a validar y sus
 * errores por campo (400) o de placa repetida (409) se muestran junto al campo
 * correspondiente. Cualquier otro error aparece arriba del formulario.
 *
 * Se monta solo mientras está abierta, así que cada apertura empieza limpia.
 *
 * @param {object} props
 * @param {object|null} props.vehiculo El vehículo a editar; null para registrar uno nuevo.
 * @param {{ id: number, nombre: string }[]} props.clientes
 * @param {(datos: object) => Promise<void>} props.alGuardar Debe lanzar el error
 *   si la API rechaza los datos; si no lanza, el formulario se da por guardado.
 * @param {() => void} props.alCerrar
 */
export function FormularioVehiculo({ vehiculo, clientes, alGuardar, alCerrar }) {
  const modo = vehiculo ? 'editar' : 'crear';
  const idFormulario = useId();
  const [valores, setValores] = useState(() => valoresIniciales(vehiculo));
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const opcionesCliente = clientes.map((cliente) => ({ valor: cliente.id, texto: cliente.nombre }));

  const cambiar = (campo, transformar = (texto) => texto) => (evento) => {
    setValores((anteriores) => ({ ...anteriores, [campo]: transformar(evento.target.value) }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  };

  async function enviar(evento) {
    evento.preventDefault();

    const resultado = validarVehiculo(valores, { modo });
    setErrores(resultado.errores);
    setErrorGeneral('');
    if (!resultado.valido) {
      return;
    }

    setEnviando(true);
    try {
      await alGuardar(resultado.datos);
    } catch (error) {
      if (!(error instanceof ErrorHttp)) {
        throw error;
      }
      const delServidor = { ...error.erroresPorCampo };
      if (error.estado === 409 && !delServidor.placa) {
        delServidor.placa = error.message;
      }
      setErrores(delServidor);
      if (Object.keys(delServidor).length === 0) {
        setErrorGeneral(error.message);
      }
      setEnviando(false);
    }
  }

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={
        modo === 'editar' ? `Editar vehículo ${formatoPlaca(vehiculo.placa)}` : 'Registrar vehículo'
      }
      pie={
        <>
          <Boton variante="secundario" onClick={alCerrar} disabled={enviando}>
            Cancelar
          </Boton>
          <Boton type="submit" form={idFormulario} cargando={enviando}>
            {modo === 'editar' ? 'Guardar cambios' : 'Registrar'}
          </Boton>
        </>
      }
    >
      <form id={idFormulario} noValidate onSubmit={enviar} className="flex flex-col gap-4">
        {errorGeneral ? (
          <Alerta tipo="error" titulo="No pudimos guardar el vehículo">
            {errorGeneral}
          </Alerta>
        ) : null}

        <CampoTexto
          etiqueta="Placa"
          name="placa"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={LARGO_PLACA}
          value={valores.placa}
          onChange={cambiar('placa', normalizarPlaca)}
          error={errores.placa}
          ayuda="ABC123 si es carro, ABC12D si es moto."
          requerido
        />
        <CampoSeleccion
          etiqueta="Tipo de vehículo"
          name="tipoVehiculo"
          marcador="Selecciona un tipo"
          opciones={OPCIONES_TIPO}
          value={valores.tipoVehiculo}
          onChange={cambiar('tipoVehiculo')}
          error={errores.tipoVehiculo}
          requerido
        />
        <div className="grid gap-4 escritorio:grid-cols-2">
          <CampoTexto
            etiqueta="Marca"
            name="marca"
            autoComplete="off"
            value={valores.marca}
            onChange={cambiar('marca')}
            error={errores.marca}
          />
          <CampoTexto
            etiqueta="Color"
            name="color"
            autoComplete="off"
            value={valores.color}
            onChange={cambiar('color')}
            error={errores.color}
          />
        </div>
        <CampoSeleccion
          etiqueta="Cliente"
          name="clienteId"
          marcador="Selecciona un cliente"
          opciones={opcionesCliente}
          value={valores.clienteId}
          onChange={cambiar('clienteId')}
          error={errores.clienteId}
          requerido
        />
      </form>
    </Modal>
  );
}
