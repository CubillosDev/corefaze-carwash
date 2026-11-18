import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { Modal } from '@/components/ui/Modal';
import { LIMITES, TIPOS_VEHICULO } from '@/constants/dominio';
import { etiquetaTipoVehiculo } from '@/constants/etiquetas';
import { actualizarServicio, crearServicio } from '@/features/servicios/api/servicios.api';
import {
  validarServicio,
  valoresDeServicio,
  VALORES_INICIALES_SERVICIO,
} from '@/features/servicios/validators/servicio.schema';
import { useFormulario } from '@/hooks/useFormulario';

const ID_FORMULARIO = 'formulario-servicio';

/**
 * Registrar o editar un servicio del catálogo con sus tarifas por tipo de
 * vehículo. Se monta solo mientras está abierto.
 *
 * @param {object} props
 * @param {object|null} props.servicio El que se edita; null para registrar.
 * @param {() => void} props.alCerrar
 * @param {(servicio: object) => void} props.alGuardar Recibe lo que devolvió la API.
 */
export function FormularioServicio({ servicio, alCerrar, alGuardar }) {
  const formulario = useFormulario({
    inicial: servicio ? valoresDeServicio(servicio) : VALORES_INICIALES_SERVICIO,
    validar: validarServicio,
    enviar: (datos) => (servicio ? actualizarServicio(servicio.id, datos) : crearServicio(datos)),
    alGuardar,
  });
  const { valores, errores, cambiar } = formulario;
  const texto = (campo) => ({
    value: valores[campo],
    onChange: (evento) => cambiar(campo, evento.target.value),
    error: errores[campo],
  });
  const cambiarTarifa = (tipo, valor) => {
    cambiar('tarifas', { ...valores.tarifas, [tipo]: valor });
    cambiar(`tarifa-${tipo}`, undefined);
  };

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      tamano="formulario"
      titulo={servicio ? 'Editar servicio' : 'Nuevo servicio'}
      descripcion="Las tarifas se escriben en pesos, sin puntos"
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
      <form id={ID_FORMULARIO} noValidate onSubmit={formulario.enviarFormulario} className="grid grid-cols-[130px_minmax(0,1fr)] gap-4">
        {formulario.errorDeApi ? (
          <Alerta tipo="error" titulo="No se pudo guardar" className="col-span-2">
            {formulario.errorDeApi}
          </Alerta>
        ) : null}
        <CampoTexto etiqueta="Número" inputMode="numeric" requerido {...texto('numero')} />
        <CampoTexto etiqueta="Nombre" maxLength={LIMITES.nombre.max} requerido {...texto('nombre')} />
        <CampoTexto
          etiqueta="Descripción"
          className="col-span-2"
          maxLength={LIMITES.observaciones.max}
          {...texto('descripcion')}
        />
        <CampoTexto etiqueta="Categoría" className="col-span-2" maxLength={LIMITES.nombre.max} {...texto('categoria')} />

        <fieldset className="col-span-2">
          <legend className="text-meta font-semibold text-neutro-700">Tarifas por tipo de vehículo</legend>
          <div className="mt-1.5 grid grid-cols-1 gap-3 escritorio:grid-cols-2">
            {Object.values(TIPOS_VEHICULO).map((tipo) => (
              <CampoTexto
                key={tipo}
                etiqueta={etiquetaTipoVehiculo(tipo)}
                inputMode="numeric"
                placeholder="Sin tarifa"
                value={valores.tarifas[tipo]}
                onChange={(evento) => cambiarTarifa(tipo, evento.target.value)}
                error={errores[`tarifa-${tipo}`]}
              />
            ))}
          </div>
          {errores.tarifas ? <p className="mt-1.5 text-meta font-medium text-error">{errores.tarifas}</p> : null}
        </fieldset>

        <label className="col-span-2 flex items-center gap-2.5 text-detalle text-neutro-900">
          <input
            type="checkbox"
            checked={valores.activo}
            onChange={(evento) => cambiar('activo', evento.target.checked)}
            className="size-4 accent-primario"
          />
          Servicio activo (se puede elegir en órdenes nuevas)
        </label>
      </form>
    </Modal>
  );
}
