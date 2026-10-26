const ordenesLavado = require('../data/ordenesLavado');
const clientesService = require('./clientes.service');
const vehiculosService = require('./vehiculos.service');
const colaboradoresService = require('./colaboradores.service');
const serviciosService = require('./servicios.service');
const jornadasService = require('./jornadas.service');
const {
  ESTADOS_ORDEN,
  ESTADOS_ORDEN_ABIERTOS,
  ESTADOS_ORDEN_CERRADOS,
  TRANSICIONES_ORDEN,
  ESTADOS_ACTIVIDAD,
  TIPOS_CLIENTE,
  MEDIOS_PAGO,
} = require('../constants/dominio');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');

/**
 * Lista las órdenes de lavado. Cada filtro es opcional y se aplica solo
 * si viene definido; los que vengan se combinan con AND.
 * @param {{ fecha?: string, colaboradorId?: number, servicioId?: number, medioPago?: string, jornadaId?: number }} [filtros]
 * @returns {object[]}
 */
const listarOrdenes = (filtros = {}) => {
  let resultado = ordenesLavado;

  if (filtros.fecha !== undefined) {
    resultado = resultado.filter((orden) => orden.fecha === filtros.fecha);
  }
  if (filtros.colaboradorId !== undefined) {
    resultado = resultado.filter((orden) => orden.colaboradorId === Number(filtros.colaboradorId));
  }
  if (filtros.servicioId !== undefined) {
    resultado = resultado.filter((orden) => orden.servicioId === Number(filtros.servicioId));
  }
  if (filtros.medioPago !== undefined) {
    resultado = resultado.filter((orden) => orden.medioPago === filtros.medioPago);
  }
  if (filtros.jornadaId !== undefined) {
    resultado = resultado.filter((orden) => orden.jornadaId === Number(filtros.jornadaId));
  }

  return resultado;
};

/**
 * Totales de un conjunto de órdenes YA FILTRADO (no vuelve a tocar el
 * arreglo global). Las órdenes canceladas nunca suman: ni a
 * cantidadServicios, ni a totalGeneral, ni a su medioPago — aunque
 * sigan apareciendo en el listado. Recorre el arreglo una sola vez.
 *
 * @param {object[]} ordenes
 * @returns {{ cantidadServicios: number, totalGeneral: number, totalesPorMedioPago: Record<string, number> }}
 */
const calcularTotales = (ordenes) => {
  const totalesPorMedioPago = Object.fromEntries(
    Object.values(MEDIOS_PAGO).map((medioPago) => [medioPago, 0]),
  );

  let cantidadServicios = 0;
  let totalGeneral = 0;

  ordenes.forEach((orden) => {
    if (orden.estado === ESTADOS_ORDEN.CANCELADA) {
      return;
    }
    cantidadServicios += 1;
    totalGeneral += orden.valor;
    totalesPorMedioPago[orden.medioPago] += orden.valor;
  });

  return { cantidadServicios, totalGeneral, totalesPorMedioPago };
};

/**
 * Agregados de una jornada sobre sus propias órdenes (SCRUM-38): unidades
 * es siempre derivado, igual al número de servicios no anulados.
 * Reutiliza listarOrdenes/calcularTotales en vez de reimplementar el
 * filtro o la suma.
 *
 * @param {number|string} jornadaId
 * @returns {{ unidades: number, ventaTotal: number }}
 */
const obtenerTotalesDeJornada = (jornadaId) => {
  const ordenesDeLaJornada = listarOrdenes({ jornadaId });
  const { cantidadServicios, totalGeneral } = calcularTotales(ordenesDeLaJornada);
  return { unidades: cantidadServicios, ventaTotal: totalGeneral };
};

/**
 * Obtiene una orden por id.
 * @param {number|string} id
 * @returns {object | null}
 */
const obtenerOrdenPorId = (id) => {
  const orden = ordenesLavado.find((candidata) => candidata.id === Number(id));
  return orden ?? null;
};

/**
 * Obtiene una orden por id, o lanza NoEncontrado (404).
 * @param {number|string} id
 * @returns {object}
 * @throws {NoEncontrado}
 */
const obtenerOrdenOFallar = (id) => {
  const orden = obtenerOrdenPorId(id);
  if (!orden) {
    throw new NoEncontrado('Orden de lavado no encontrada');
  }
  return orden;
};

/**
 * Integridad referencial (patrón <entidad>Tiene<Relacion>() del estándar):
 * cancelar una orden no es lo mismo que eliminarla, así que cuenta
 * CUALQUIER orden sin importar su estado, incluidas entregada y cancelada.
 *
 * @param {number|string} colaboradorId
 * @returns {boolean}
 */
const colaboradorTieneOrdenes = (colaboradorId) =>
  ordenesLavado.some((orden) => orden.colaboradorId === Number(colaboradorId));

/**
 * Igual que colaboradorTieneOrdenes, para servicioId.
 * @param {number|string} servicioId
 * @returns {boolean}
 */
const servicioTieneOrdenes = (servicioId) =>
  ordenesLavado.some((orden) => orden.servicioId === Number(servicioId));

/**
 * Igual que colaboradorTieneOrdenes, para vehiculoId.
 * @param {number|string} vehiculoId
 * @returns {boolean}
 */
const vehiculoTieneOrdenes = (vehiculoId) =>
  ordenesLavado.some((orden) => orden.vehiculoId === Number(vehiculoId));

/** R5: el turno es único por fecha (equivalente a "por jornada", ya que cada jornada tiene una sola fecha). */
const existeTurnoOcupado = (fecha, turno) =>
  ordenesLavado.some((orden) => orden.fecha === fecha && orden.turno === Number(turno));

/**
 * R2: el colaborador asignado debe estar activo. La usan crearOrden y
 * editarOrden cuando el colaborador cambia.
 * @param {object} colaborador
 * @throws {Conflicto}
 */
const validarColaboradorActivo = (colaborador) => {
  if (colaborador.estado !== ESTADOS_ACTIVIDAD.ACTIVO) {
    throw new Conflicto('No se puede asignar una orden a un colaborador inactivo');
  }
};

/**
 * R3: el servicio debe estar activo y tener tarifa para el tipo de
 * vehículo (obtenerTarifaParaTipoVehiculo ya lanza Conflicto si falta).
 * La usan crearOrden y editarOrden: esta última SIEMPRE la vuelve a
 * llamar, porque el valor depende del tipo de vehículo final.
 *
 * @param {object} servicio
 * @param {string} tipoVehiculo
 * @returns {number} el valor de la tarifa
 * @throws {Conflicto}
 */
const calcularValorServicio = (servicio, tipoVehiculo) => {
  if (servicio.activo !== true) {
    throw new Conflicto('El servicio no está activo');
  }
  return serviciosService.obtenerTarifaParaTipoVehiculo(servicio, tipoVehiculo);
};

/**
 * R7: los servicios con lavado de motor exigen autorización explícita.
 * @param {object} servicio
 * @param {boolean|undefined} autorizaMotor
 * @throws {Conflicto}
 */
const validarAutorizacionMotor = (servicio, autorizaMotor) => {
  if (serviciosService.requiereAutorizacionMotor(servicio.numero) && autorizaMotor !== true) {
    throw new Conflicto('Este servicio exige autorización explícita para lavado de motor');
  }
};

/**
 * R8: clienteId solo se procesa (y se exige) cuando el pago es a
 * crédito. La usan crearOrden y editarOrden cuando medioPago o
 * clienteId cambian.
 *
 * async porque clientesService.obtenerClienteOFallar ya consulta Supabase
 * (SCRUM-152); este service sigue 100% en memoria, solo espera ese resultado.
 *
 * @param {string} medioPago
 * @param {number|string|undefined} clienteId
 * @returns {Promise<number|null>} el clienteId final de la orden
 * @throws {Conflicto} si falta clienteId, o el cliente no tiene crédito habilitado
 * @throws {NoEncontrado} si el clienteId no existe
 */
const resolverClienteCredito = async (medioPago, clienteId) => {
  if (medioPago !== MEDIOS_PAGO.CREDITO) {
    return null;
  }

  if (!clienteId) {
    throw new Conflicto('El pago a crédito requiere un clienteId');
  }

  const cliente = await clientesService.obtenerClienteOFallar(clienteId);
  if (
    cliente.estado !== ESTADOS_ACTIVIDAD.ACTIVO ||
    cliente.tipo !== TIPOS_CLIENTE.EMPRESA ||
    cliente.creditoHabilitado !== true
  ) {
    throw new Conflicto('El cliente no tiene crédito habilitado');
  }

  return Number(clienteId);
};

/**
 * R3 (aplicabilidad, al editar): el servicio de la orden debe tener
 * tarifa para el tipo de vehículo nuevo. Reutiliza
 * serviciosService.obtenerTarifaParaTipoVehiculo —la misma función que
 * consulta calcularValorServicio— pero descarta el valor devuelto: es
 * una verificación de aplicabilidad servicio↔tipo, no de precio. No
 * revisa servicio.activo; esa parte de R3 solo se revalida al crear.
 *
 * @param {number|string} servicioId
 * @param {string} tipoVehiculo
 * @throws {Conflicto} si el servicio no tiene tarifa para ese tipo de vehículo
 */
const validarServicioAplicaATipo = (servicioId, tipoVehiculo) => {
  const servicio = serviciosService.obtenerServicioOFallar(servicioId);
  serviciosService.obtenerTarifaParaTipoVehiculo(servicio, tipoVehiculo);
};

/**
 * R6: un vehículo no puede tener más de una orden abierta a la vez.
 * `idOrdenAExcluir` permite revalidar esta regla al editar una orden sin
 * que choque contra sí misma; al crear, se le pasa null.
 *
 * @param {number|string} vehiculoId
 * @param {number|null} idOrdenAExcluir
 * @throws {Conflicto}
 */
const validarVehiculoSinOtraOrdenAbierta = (vehiculoId, idOrdenAExcluir) => {
  const tieneOrdenAbierta = ordenesLavado.some(
    (orden) =>
      orden.vehiculoId === Number(vehiculoId) &&
      orden.id !== idOrdenAExcluir &&
      ESTADOS_ORDEN_ABIERTOS.includes(orden.estado),
  );

  if (tieneOrdenAbierta) {
    throw new Conflicto('El vehículo ya tiene una orden abierta');
  }
};

/**
 * Crea una orden de lavado nueva, aplicando en orden las reglas R1 a R8
 * del estándar del proyecto. Si alguna falla, lanza su error y no evalúa
 * las siguientes. La orden queda amarrada a la jornada abierta en ese
 * momento; su fecha es siempre la de esa jornada.
 *
 * async porque resolverClienteCredito (R8) ya espera a clientesService.
 *
 * @param {{ turno: number, vehiculoId: number, servicioId: number, colaboradorId: number, medioPago: string, clienteId?: number, autorizaMotor?: boolean, observaciones?: string }} datos
 * @returns {Promise<object>} la orden creada
 * @throws {Conflicto} si no hay ninguna jornada abierta
 */
const crearOrden = async (datos) => {
  const jornada = jornadasService.obtenerJornadaAbierta();
  if (!jornada) {
    throw new Conflicto('No hay una jornada abierta para registrar órdenes');
  }

  // R1: vehículo, servicio y colaborador deben existir (404 si no).
  const vehiculo = vehiculosService.obtenerVehiculoOFallar(datos.vehiculoId);
  const servicio = serviciosService.obtenerServicioOFallar(datos.servicioId);
  const colaborador = colaboradoresService.obtenerColaboradorOFallar(datos.colaboradorId);

  validarColaboradorActivo(colaborador); // R2
  const valor = calcularValorServicio(servicio, vehiculo.tipoVehiculo); // R3
  validarAutorizacionMotor(servicio, datos.autorizaMotor); // R7
  const clienteId = await resolverClienteCredito(datos.medioPago, datos.clienteId); // R8

  // R5: un turno solo puede tener una orden por fecha.
  if (existeTurnoOcupado(jornada.fecha, datos.turno)) {
    throw new Conflicto('El turno ya está ocupado para esa fecha');
  }

  validarVehiculoSinOtraOrdenAbierta(datos.vehiculoId, null); // R6

  // R4 + allowlisting: el valor es siempre el calculado en R3, nunca el
  // que venga en datos; el objeto final se arma campo por campo.
  const nuevaOrden = {
    id: ordenesLavado.length > 0 ? Math.max(...ordenesLavado.map((orden) => orden.id)) + 1 : 1,
    jornadaId: jornada.id,
    fecha: jornada.fecha,
    turno: datos.turno,
    vehiculoId: Number(datos.vehiculoId),
    servicioId: Number(datos.servicioId),
    colaboradorId: Number(datos.colaboradorId),
    valor,
    medioPago: datos.medioPago,
    clienteId,
    autorizaMotor: Boolean(datos.autorizaMotor ?? false),
    observaciones: datos.observaciones ?? null,
    motivo: null,
    estado: ESTADOS_ORDEN.REGISTRADA,
    creadaEn: new Date().toISOString(),
  };

  ordenesLavado.push(nuevaOrden);
  return nuevaOrden;
};

/**
 * Edita campos no financieros de una orden abierta: vehiculoId,
 * colaboradorId, medioPago, clienteId, observaciones. NUNCA valor,
 * servicioId, estado, fecha ni jornadaId — si vienen en datos, se
 * ignoran (el validador de la capa anterior tampoco los acepta).
 *
 * `valor` es inmutable desde la creación: se fija una sola vez en
 * crearOrden y esta función nunca lo recalcula ni lo toca, sin importar
 * si la tarifa del servicio cambió o el vehículo editado tiene un tipo
 * distinto. Editar es para corregir datos operativos, nunca el monto
 * cobrado. Como consecuencia, el 409 "El servicio no está activo" ya no
 * puede dispararse desde aquí (solo desde crearOrden, que es quien sí
 * calcula el valor).
 *
 * Reutiliza las mismas reglas R2/R3 (aplicabilidad)/R6/R8 que crearOrden,
 * mediante las funciones privadas de este archivo, para no duplicar su
 * lógica. Si el vehículo cambia, revalida que el servicio original
 * tenga tarifa para el tipo de vehículo nuevo (R3), sin importar si el
 * tipo coincide con el anterior o no.
 *
 * async por la misma razón que crearOrden: espera a resolverClienteCredito.
 *
 * @param {number|string} id
 * @param {{ vehiculoId?: number, colaboradorId?: number, medioPago?: string, clienteId?: number, observaciones?: string }} datos
 * @returns {Promise<object>} la orden editada
 * @throws {NoEncontrado} si el id no existe, o el nuevo vehiculoId/colaboradorId no existen
 * @throws {Conflicto} si la orden está cerrada, su jornada ya no está abierta, o viola R2/R3/R6/R8
 */
const editarOrden = async (id, datos) => {
  const orden = obtenerOrdenOFallar(id);

  if (ESTADOS_ORDEN_CERRADOS.includes(orden.estado)) {
    throw new Conflicto('No se puede editar una orden entregada o cancelada');
  }

  if (!jornadasService.jornadaEstaAbierta(orden.jornadaId)) {
    throw new Conflicto('No se puede editar una orden de una jornada que ya no está abierta');
  }

  const vehiculoIdFinal =
    datos.vehiculoId !== undefined ? Number(datos.vehiculoId) : orden.vehiculoId;
  const colaboradorIdFinal =
    datos.colaboradorId !== undefined ? Number(datos.colaboradorId) : orden.colaboradorId;
  const medioPagoFinal = datos.medioPago ?? orden.medioPago;
  const clienteIdFinal = datos.clienteId !== undefined ? datos.clienteId : orden.clienteId;

  if (vehiculoIdFinal !== orden.vehiculoId) {
    const vehiculo = vehiculosService.obtenerVehiculoOFallar(vehiculoIdFinal); // R1
    validarVehiculoSinOtraOrdenAbierta(vehiculoIdFinal, orden.id); // R6
    validarServicioAplicaATipo(orden.servicioId, vehiculo.tipoVehiculo); // R3 (aplicabilidad)
  }

  if (colaboradorIdFinal !== orden.colaboradorId) {
    const colaborador = colaboradoresService.obtenerColaboradorOFallar(colaboradorIdFinal); // R1
    validarColaboradorActivo(colaborador); // R2
  }

  let clienteIdResuelto = orden.clienteId;
  if (medioPagoFinal !== orden.medioPago || clienteIdFinal !== orden.clienteId) {
    clienteIdResuelto = await resolverClienteCredito(medioPagoFinal, clienteIdFinal); // R8
  }

  Object.assign(orden, {
    vehiculoId: vehiculoIdFinal,
    colaboradorId: colaboradorIdFinal,
    medioPago: medioPagoFinal,
    clienteId: clienteIdResuelto,
    observaciones: datos.observaciones !== undefined ? datos.observaciones : orden.observaciones,
  });

  return orden;
};

/**
 * Cambia el estado de una orden siguiendo la máquina de estados del
 * dominio compartido.
 *
 * R10: una orden cerrada (entregada o cancelada) no puede cambiar de
 * estado nunca más. R9: cualquier otra transición debe estar listada en
 * TRANSICIONES_ORDEN[estado actual]. Cancelar exige motivo; para
 * cualquier otro estado, motivo se ignora.
 *
 * @param {number|string} id
 * @param {string} nuevoEstado
 * @param {string} [motivo] obligatorio solo si nuevoEstado es "cancelada"
 * @returns {object} la orden actualizada
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si la orden ya está cerrada o la transición no es válida
 * @throws {SolicitudInvalida} si se cancela sin motivo
 */
const cambiarEstadoOrden = (id, nuevoEstado, motivo) => {
  const orden = obtenerOrdenOFallar(id);

  if (ESTADOS_ORDEN_CERRADOS.includes(orden.estado)) {
    throw new Conflicto('Una orden entregada o cancelada no puede cambiar de estado');
  }

  const transicionesPermitidas = TRANSICIONES_ORDEN[orden.estado];
  if (!transicionesPermitidas.includes(nuevoEstado)) {
    throw new Conflicto(`Transición de estado no permitida: de ${orden.estado} a ${nuevoEstado}`);
  }

  if (nuevoEstado === ESTADOS_ORDEN.CANCELADA) {
    if (!motivo) {
      throw new SolicitudInvalida([
        { campo: 'motivo', mensaje: 'El motivo es obligatorio para cancelar una orden' },
      ]);
    }
    orden.motivo = motivo;
  }

  orden.estado = nuevoEstado;
  return orden;
};

module.exports = {
  listarOrdenes,
  obtenerOrdenPorId,
  obtenerOrdenOFallar,
  colaboradorTieneOrdenes,
  servicioTieneOrdenes,
  vehiculoTieneOrdenes,
  crearOrden,
  editarOrden,
  cambiarEstadoOrden,
  calcularTotales,
  obtenerTotalesDeJornada,
};
