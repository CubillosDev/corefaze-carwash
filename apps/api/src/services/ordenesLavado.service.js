const ordenesLavado = require('../data/ordenesLavado');
const clientesService = require('./clientes.service');
const vehiculosService = require('./vehiculos.service');
const colaboradoresService = require('./colaboradores.service');
const serviciosService = require('./servicios.service');
const {
  ESTADOS_ORDEN,
  ESTADOS_ORDEN_ABIERTOS,
  ESTADOS_ORDEN_CERRADOS,
  TRANSICIONES_ORDEN,
  ESTADOS_ACTIVIDAD,
  TIPOS_CLIENTE,
  MEDIOS_PAGO,
} = require('../constants/dominio');
const { Conflicto, NoEncontrado } = require('../utils/errores');

/**
 * Lista las órdenes de lavado. Si filtros.fecha viene definido, filtra
 * por ese campo exacto; si no, devuelve todas.
 * @param {{ fecha?: string }} [filtros]
 * @returns {object[]}
 */
const listarOrdenes = (filtros = {}) => {
  if (filtros.fecha !== undefined) {
    return ordenesLavado.filter((orden) => orden.fecha === filtros.fecha);
  }
  return ordenesLavado;
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

/** R5: el turno es único por fecha. */
const existeTurnoOcupado = (fecha, turno) =>
  ordenesLavado.some((orden) => orden.fecha === fecha && orden.turno === Number(turno));

/** R6: un vehículo no puede tener dos órdenes abiertas al mismo tiempo. */
const vehiculoTieneOrdenAbierta = (vehiculoId) =>
  ordenesLavado.some(
    (orden) =>
      orden.vehiculoId === Number(vehiculoId) && ESTADOS_ORDEN_ABIERTOS.includes(orden.estado),
  );

/**
 * Crea una orden de lavado nueva, aplicando en orden las reglas R1 a R8
 * del estándar del proyecto. Si alguna falla, lanza su error y no evalúa
 * las siguientes.
 *
 * @param {{ fecha: string, turno: number, vehiculoId: number, servicioId: number, colaboradorId: number, medioPago: string, clienteId?: number, autorizaMotor?: boolean, observaciones?: string }} datos
 * @returns {object} la orden creada
 */
const crearOrden = (datos) => {
  // R1: vehículo, servicio y colaborador deben existir (404 si no).
  const vehiculo = vehiculosService.obtenerVehiculoOFallar(datos.vehiculoId);
  const servicio = serviciosService.obtenerServicioOFallar(datos.servicioId);
  const colaborador = colaboradoresService.obtenerColaboradorOFallar(datos.colaboradorId);

  // R2: el colaborador debe estar activo.
  if (colaborador.estado !== ESTADOS_ACTIVIDAD.ACTIVO) {
    throw new Conflicto('No se puede asignar una orden a un colaborador inactivo');
  }

  // R3: el servicio debe estar activo y tener tarifa para el tipo de
  // vehículo (obtenerTarifaParaTipoVehiculo ya lanza Conflicto si falta).
  if (servicio.activo !== true) {
    throw new Conflicto('El servicio no está activo');
  }
  const valor = serviciosService.obtenerTarifaParaTipoVehiculo(servicio, vehiculo.tipo);

  // R7: los servicios con lavado de motor exigen autorización explícita.
  if (serviciosService.requiereAutorizacionMotor(servicio.numero) && datos.autorizaMotor !== true) {
    throw new Conflicto('Este servicio exige autorización explícita para lavado de motor');
  }

  // R8: clienteId solo se procesa (y se exige) cuando el pago es a crédito.
  let clienteId = null;
  if (datos.medioPago === MEDIOS_PAGO.CREDITO) {
    if (!datos.clienteId) {
      throw new Conflicto('El pago a crédito requiere un clienteId');
    }
    const cliente = clientesService.obtenerClienteOFallar(datos.clienteId);
    if (
      cliente.estado !== ESTADOS_ACTIVIDAD.ACTIVO ||
      cliente.tipo !== TIPOS_CLIENTE.EMPRESA ||
      cliente.creditoHabilitado !== true
    ) {
      throw new Conflicto('El cliente no tiene crédito habilitado');
    }
    clienteId = Number(datos.clienteId);
  }

  // R5: un turno solo puede tener una orden por fecha.
  if (existeTurnoOcupado(datos.fecha, datos.turno)) {
    throw new Conflicto('El turno ya está ocupado para esa fecha');
  }

  // R6: un vehículo no puede tener más de una orden abierta a la vez.
  if (vehiculoTieneOrdenAbierta(datos.vehiculoId)) {
    throw new Conflicto('El vehículo ya tiene una orden abierta');
  }

  // R4 + allowlisting: el valor es siempre el calculado en R3, nunca el
  // que venga en datos; el objeto final se arma campo por campo.
  const nuevaOrden = {
    id: ordenesLavado.length > 0 ? Math.max(...ordenesLavado.map((orden) => orden.id)) + 1 : 1,
    fecha: datos.fecha,
    turno: datos.turno,
    vehiculoId: Number(datos.vehiculoId),
    servicioId: Number(datos.servicioId),
    colaboradorId: Number(datos.colaboradorId),
    valor,
    medioPago: datos.medioPago,
    clienteId,
    autorizaMotor: Boolean(datos.autorizaMotor ?? false),
    observaciones: datos.observaciones ?? null,
    estado: ESTADOS_ORDEN.REGISTRADA,
  };

  ordenesLavado.push(nuevaOrden);
  return nuevaOrden;
};

/**
 * Cambia el estado de una orden siguiendo la máquina de estados del
 * dominio compartido.
 *
 * R10: una orden cerrada (entregada o cancelada) no puede cambiar de
 * estado nunca más. R9: cualquier otra transición debe estar listada en
 * TRANSICIONES_ORDEN[estado actual].
 *
 * @param {number|string} id
 * @param {string} nuevoEstado
 * @returns {object} la orden actualizada
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si la orden ya está cerrada o la transición no es válida
 */
const cambiarEstadoOrden = (id, nuevoEstado) => {
  const orden = obtenerOrdenOFallar(id);

  if (ESTADOS_ORDEN_CERRADOS.includes(orden.estado)) {
    throw new Conflicto('Una orden entregada o cancelada no puede cambiar de estado');
  }

  const transicionesPermitidas = TRANSICIONES_ORDEN[orden.estado];
  if (!transicionesPermitidas.includes(nuevoEstado)) {
    throw new Conflicto(`Transición de estado no permitida: de ${orden.estado} a ${nuevoEstado}`);
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
  cambiarEstadoOrden,
};
