import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoSeleccion } from '@/components/ui/CampoSeleccion';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { ESTADOS_ACTIVIDAD, LIMITES, TIPOS_CLIENTE } from '@/constants/dominio';
import { etiquetaEstadoActividad, etiquetaTipoCliente } from '@/constants/etiquetas';
import { actualizarCliente, crearCliente } from '@/features/clientes/api/clientes.api';
import {
  validarCliente,
  valoresDeCliente,
  VALORES_INICIALES_CLIENTE,
} from '@/features/clientes/validators/cliente.schema';
import { useFormulario } from '@/hooks/useFormulario';

const ID_FORMULARIO = 'formulario-cliente';

const opcionesDe = (valores, etiqueta) => Object.values(valores).map((valor) => ({ valor, texto: etiqueta(valor) }));

/**
 * Registrar o editar un cliente. Se monta solo mientras está abierto.
 *
 * @param {object} props
 * @param {object|null} props.cliente El que se edita; null para registrar.
 * @param {() => void} props.alCerrar
 * @param {(cliente: object) => void} props.alGuardar Recibe lo que devolvió la API.
 */
export function FormularioCliente({ cliente, alCerrar, alGuardar }) {
  const formulario = useFormulario({
    inicial: cliente ? valoresDeCliente(cliente) : VALORES_INICIALES_CLIENTE,
    validar: validarCliente,
    enviar: (datos) => (cliente ? actualizarCliente(cliente.id, datos) : crearCliente(datos)),
    alGuardar,
  });
  const { valores, errores, cambiar } = formulario;
  const texto = (campo) => ({
    value: valores[campo],
    onChange: (evento) => cambiar(campo, evento.target.value),
    error: errores[campo],
  });

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      titulo={cliente ? 'Editar cliente' : 'Nuevo cliente'}
      pie={
        <>
          <Boton variante="secundario" tamano="grande" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={ID_FORMULARIO} tamano="grande" cargando={formulario.enviando}>
            Guardar
          </Boton>
        </>
      }
    >
      <form id={ID_FORMULARIO} noValidate onSubmit={formulario.enviarFormulario} className="grid grid-cols-2 gap-4">
        {formulario.errorDeApi ? (
          <Alerta tipo="error" titulo="No se pudo guardar" className="col-span-2">
            {formulario.errorDeApi}
          </Alerta>
        ) : null}
        <CampoTexto etiqueta="Nombre" className="col-span-2" maxLength={LIMITES.nombre.max} requerido {...texto('nombre')} />
        <CampoTexto etiqueta="Documento" maxLength={LIMITES.documento.max} requerido {...texto('documento')} />
        <CampoSeleccion etiqueta="Tipo" opciones={opcionesDe(TIPOS_CLIENTE, etiquetaTipoCliente)} requerido {...texto('tipo')} />
        <CampoTexto
          etiqueta="Teléfono"
          type="tel"
          inputMode="numeric"
          maxLength={LIMITES.telefono.longitud}
          requerido
          {...texto('telefono')}
        />
        <CampoTexto etiqueta="Correo (opcional)" type="email" {...texto('email')} />
        {cliente ? (
          <CampoSeleccion
            etiqueta="Estado"
            opciones={opcionesDe(ESTADOS_ACTIVIDAD, etiquetaEstadoActividad)}
            {...texto('estado')}
          />
        ) : null}
        <label className="col-span-2 flex items-center gap-2.5 text-detalle text-neutro-900">
          <input
            type="checkbox"
            checked={valores.creditoHabilitado}
            onChange={(evento) => cambiar('creditoHabilitado', evento.target.checked)}
            className="size-4 accent-primario"
          />
          Crédito habilitado (puede pagar órdenes con el medio Crédito)
        </label>
      </form>
    </Modal>
  );
}
