import { useState } from 'react';
import { Link } from 'react-router';

import { Alerta } from '@/components/ui/Alerta';
import { Boton } from '@/components/ui/Boton';
import { CampoSeleccion } from '@/components/ui/CampoSeleccion';
import { CampoTexto } from '@/components/ui/CampoTexto';
import { EstadoCarga } from '@/components/ui/EstadoCarga';
import { EstadoError } from '@/components/ui/EstadoError';
import { Modal } from '@/components/ui/Modal';
import { ESTADOS_ACTIVIDAD, LIMITES, MEDIOS_PAGO } from '@/constants/dominio';
import { etiquetaMedioPago, etiquetaTipoVehiculo } from '@/constants/etiquetas';
import { RUTAS } from '@/constants/rutas';
import { listarClientes } from '@/features/clientes';
import { listarColaboradores } from '@/features/colaboradores';
import { crearOrden } from '@/features/ordenes-lavado/api/ordenesLavado.api';
import { SelectorColaborador } from '@/features/ordenes-lavado/components/SelectorColaborador';
import { SelectorServicio } from '@/features/ordenes-lavado/components/SelectorServicio';
import {
  exigeAutorizacionMotor,
  validarNuevaOrden,
  VALORES_INICIALES_ORDEN,
} from '@/features/ordenes-lavado/validators/ordenLavado.schema';
import { listarServicios } from '@/features/servicios';
import { listarVehiculos, normalizarPlaca } from '@/features/vehiculos';
import { useCarga } from '@/hooks/useCarga';

const OPCIONES_MEDIO_PAGO = Object.values(MEDIOS_PAGO).map((valor) => ({
  valor,
  texto: etiquetaMedioPago(valor),
}));

async function cargarCatalogos(signal) {
  const [vehiculos, servicios, colaboradores, clientes] = await Promise.all([
    listarVehiculos({ signal }),
    listarServicios({ signal }),
    listarColaboradores({ signal }),
    listarClientes({ signal }),
  ]);
  return {
    vehiculos,
    // Solo se ofrece lo que puede recibir órdenes; la API valida igual (R2, R3, R8).
    servicios: servicios.filter((servicio) => servicio.activo),
    colaboradores: colaboradores.filter((colaborador) => colaborador.estado === ESTADOS_ACTIVIDAD.ACTIVO),
    clientesConCredito: clientes.filter(
      (cliente) => cliente.creditoHabilitado && cliente.estado === ESTADOS_ACTIVIDAD.ACTIVO,
    ),
  };
}

const ID_FORMULARIO = 'formulario-nueva-orden';

/**
 * La API responde 409 con un mensaje sobre la jornada cuando no hay una
 * abierta: ese caso lleva a la pantalla de jornadas.
 */
const esErrorDeJornada = (mensaje) => /jornada/i.test(mensaje);

/**
 * Ventana "Nueva orden" (en el diseño, "Nuevo servicio"). Envía a POST
 * /api/ordenes-lavado solo lo que la persona escribe: ni valor ni estado. Si
 * no hay jornada abierta, la API responde 409 y se muestra su aviso con el
 * enlace a Jornadas.
 *
 * Quien la usa la monta solo mientras está abierta: así cada apertura empieza
 * limpia y carga los catálogos al día.
 *
 * @param {object} props
 * @param {() => void} props.alCerrar
 * @param {(orden: object) => void} props.alCrear Recibe la orden creada por la API.
 */
export function FormularioOrden({ alCerrar, alCrear }) {
  const catalogos = useCarga(cargarCatalogos);
  const [valores, setValores] = useState(VALORES_INICIALES_ORDEN);
  const [errores, setErrores] = useState({});
  const [errorDeApi, setErrorDeApi] = useState('');
  const [enviando, setEnviando] = useState(false);

  const datos = catalogos.datos;
  const placa = normalizarPlaca(valores.placa);
  const vehiculo = datos?.vehiculos.find((candidato) => candidato.placa === placa) ?? null;
  const servicio = datos?.servicios.find((candidato) => candidato.id === valores.servicioId) ?? null;
  const completo = Boolean(placa && valores.turno && valores.servicioId && valores.colaboradorId);

  const cambiar = (campo, valor) => {
    setValores((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  };

  async function enviar(evento) {
    evento.preventDefault();
    const resultado = validarNuevaOrden(valores, { vehiculos: datos?.vehiculos ?? [], servicio });
    setErrores(resultado.errores);
    setErrorDeApi('');
    if (!resultado.valido) {
      return;
    }

    setEnviando(true);
    try {
      alCrear(await crearOrden(resultado.datos));
    } catch (error) {
      setErrores(error.erroresPorCampo ?? {});
      setErrorDeApi(error.message);
      setEnviando(false);
    }
  }

  const listo = catalogos.situacion === 'listo';

  return (
    <Modal
      abierto
      alCerrar={alCerrar}
      tamano="formulario"
      titulo="Nueva orden"
      descripcion="Entra al tablero como registrada · El valor lo calcula el sistema"
      pie={
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-nota text-neutro-600">Valor</p>
            <p className="text-detalle font-semibold text-neutro-900">Lo calcula el sistema al registrar</p>
          </div>
          <Boton variante="secundario" tamano="grande" onClick={alCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={ID_FORMULARIO} tamano="grande" cargando={enviando} disabled={!listo || !completo}>
            Registrar orden
          </Boton>
        </>
      }
    >
      {catalogos.situacion === 'cargando' ? (
        <EstadoCarga texto="Cargando vehículos, servicios y colaboradores…" />
      ) : null}
      {catalogos.situacion === 'error' ? (
        <EstadoError mensaje={catalogos.error} alReintentar={catalogos.recargar} />
      ) : null}
      {listo ? (
        <form id={ID_FORMULARIO} noValidate onSubmit={enviar}>
          {errorDeApi ? (
            <Alerta
              tipo={esErrorDeJornada(errorDeApi) ? 'advertencia' : 'error'}
              titulo="No se pudo registrar la orden"
              className="mb-4"
            >
              {errorDeApi}{' '}
              {esErrorDeJornada(errorDeApi) ? (
                <Link to={RUTAS.JORNADAS} onClick={alCerrar} className="font-semibold underline">
                  Ir a jornadas
                </Link>
              ) : null}
            </Alerta>
          ) : null}

          <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-2.5">
            <CampoTexto
              etiqueta="Placa"
              variante="placa"
              placeholder="ABC123"
              autoComplete="off"
              value={valores.placa}
              onChange={(evento) => cambiar('placa', evento.target.value)}
              error={errores.placa}
              requerido
            />
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-meta font-semibold text-neutro-700">Vehículo</span>
              <p
                aria-live="polite"
                className={`flex h-9.5 items-center truncate rounded-control border border-neutro-200 bg-neutro-25 px-3 text-cuerpo ${
                  vehiculo ? 'font-medium text-neutro-900' : 'text-neutro-400'
                }`}
              >
                {vehiculo
                  ? [vehiculo.marca, vehiculo.color, etiquetaTipoVehiculo(vehiculo.tipoVehiculo)].filter(Boolean).join(' · ')
                  : 'Se completa con la placa registrada'}
              </p>
            </div>
          </div>

          <SelectorServicio
            servicios={datos.servicios}
            valor={valores.servicioId}
            alCambiar={(id) => cambiar('servicioId', id)}
            error={errores.servicioId}
          />

          {exigeAutorizacionMotor(servicio) ? (
            <label className="mt-3 flex items-start gap-2.5 rounded-bloque bg-advertencia-suave px-3 py-2.5 text-detalle text-neutro-900">
              <input
                type="checkbox"
                checked={valores.autorizaMotor}
                onChange={(evento) => cambiar('autorizaMotor', evento.target.checked)}
                className="mt-0.5 size-4 accent-primario"
              />
              El cliente autoriza el lavado de motor.
            </label>
          ) : null}

          <SelectorColaborador
            colaboradores={datos.colaboradores}
            valor={valores.colaboradorId}
            alCambiar={(id) => cambiar('colaboradorId', id)}
            error={errores.colaboradorId}
          />

          <div className="mt-4.5 grid grid-cols-[130px_minmax(0,1fr)] gap-2.5">
            <CampoTexto
              etiqueta="Turno"
              type="number"
              inputMode="numeric"
              min={LIMITES.turno.min}
              step={1}
              value={valores.turno}
              onChange={(evento) => cambiar('turno', evento.target.value)}
              error={errores.turno}
              requerido
            />
            <CampoSeleccion
              etiqueta="Medio de pago"
              opciones={OPCIONES_MEDIO_PAGO}
              value={valores.medioPago}
              onChange={(evento) => cambiar('medioPago', evento.target.value)}
              error={errores.medioPago}
              requerido
            />
          </div>

          {valores.medioPago === MEDIOS_PAGO.CREDITO ? (
            <CampoSeleccion
              etiqueta="Cliente con crédito"
              className="mt-4.5"
              marcador="Elige el cliente"
              opciones={datos.clientesConCredito.map((cliente) => ({ valor: cliente.id, texto: cliente.nombre }))}
              value={valores.clienteId}
              onChange={(evento) => cambiar('clienteId', evento.target.value)}
              error={errores.clienteId}
              ayuda={datos.clientesConCredito.length === 0 ? 'No hay clientes con crédito habilitado.' : undefined}
              requerido
            />
          ) : null}

          <CampoTexto
            etiqueta="Observaciones de recepción"
            className="mt-4.5"
            placeholder="Rayones, golpes, accesorios u objetos de valor"
            maxLength={LIMITES.observaciones.max}
            value={valores.observaciones}
            onChange={(evento) => cambiar('observaciones', evento.target.value)}
            error={errores.observaciones}
          />
        </form>
      ) : null}
    </Modal>
  );
}
