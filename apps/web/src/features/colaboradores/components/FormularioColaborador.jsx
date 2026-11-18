import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoSeleccion } from '@/components/ui/CampoSeleccion';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { LIMITES, TIPOS_VINCULACION } from '@/constants/dominio';
import { etiquetaTipoVinculacion } from '@/constants/etiquetas';
import { actualizarColaborador, crearColaborador } from '@/features/colaboradores/api/colaboradores.api';
import {
  validarColaborador,
  valoresDeColaborador,
  VALORES_INICIALES_COLABORADOR,
} from '@/features/colaboradores/validators/colaborador.schema';
import { useFormulario } from '@/hooks/useFormulario';

const ID_FORMULARIO = 'formulario-colaborador';

const OPCIONES_VINCULACION = Object.values(TIPOS_VINCULACION).map((valor) => ({
  valor,
  texto: etiquetaTipoVinculacion(valor),
}));

/**
 * Registrar o editar un colaborador. Se monta solo mientras está abierto.
 *
 * @param {object} props
 * @param {object|null} props.colaborador El que se edita; null para registrar.
 * @param {() => void} props.alCerrar
 * @param {(colaborador: object) => void} props.alGuardar Recibe lo que devolvió la API.
 */
export function FormularioColaborador({ colaborador, alCerrar, alGuardar }) {
  const formulario = useFormulario({
    inicial: colaborador ? valoresDeColaborador(colaborador) : VALORES_INICIALES_COLABORADOR,
    validar: validarColaborador,
    enviar: (datos) => (colaborador ? actualizarColaborador(colaborador.id, datos) : crearColaborador(datos)),
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
      titulo={colaborador ? 'Editar colaborador' : 'Nuevo colaborador'}
      descripcion="Los colaboradores no se borran: se desactivan"
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
        <CampoTexto
          etiqueta="Código"
          inputMode="numeric"
          maxLength={LIMITES.codigoColaborador.longitud}
          ayuda={`${LIMITES.codigoColaborador.longitud} dígitos`}
          requerido
          {...texto('codigo')}
        />
        <CampoSeleccion
          etiqueta="Vinculación"
          opciones={OPCIONES_VINCULACION}
          requerido
          {...texto('tipoVinculacion')}
        />
        <CampoTexto etiqueta="Nombre" className="col-span-2" maxLength={LIMITES.nombre.max} requerido {...texto('nombre')} />
        <CampoTexto etiqueta="Documento" maxLength={LIMITES.documento.max} requerido {...texto('documento')} />
        <CampoTexto
          etiqueta="Teléfono"
          type="tel"
          inputMode="numeric"
          maxLength={LIMITES.telefono.longitud}
          requerido
          {...texto('telefono')}
        />
        <CampoTexto
          etiqueta="Comisión (%)"
          inputMode="decimal"
          ayuda="Porcentaje del servicio para el colaborador"
          requerido
          {...texto('porcentaje')}
        />
      </form>
    </Modal>
  );
}
