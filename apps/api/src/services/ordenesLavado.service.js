const { ordenesLavado, obtenerSiguienteId } = require("../data/ordenesLavado");
const vehiculosService = require("./vehiculos.service");
const serviciosService = require("./servicios.service");
const colaboradoresService = require("./colaboradores.service");
const clientesService = require("./clientes.service");
const AppError = require("../utils/AppError");
const {
  TRANSICIONES_ESTADO_ORDEN,
  ESTADOS_ORDEN_FINALES,
  SERVICIOS_QUE_EXIGEN_AUTORIZACION_MOTOR,
} = require("../constants/dominio");

const ESTADOS_ORDEN_ABIERTA = ["registrada", "en_proceso"];

const obtenerOrdenes = (filtros = {}) => {
  if (filtros.fecha) return ordenesLavado.filter((o) => o.fecha === filtros.fecha);
  return ordenesLavado;
};

const obtenerOrdenPorId = (id) => ordenesLavado.find((o) => o.id === Number(id));

const obtenerOrdenesPorColaborador = (colaboradorId, fecha) =>
  ordenesLavado.filter((o) => o.colaboradorId === Number(colaboradorId) && (!fecha || o.fecha === fecha));

const obtenerOrdenesPorCliente = (clienteId) =>
  ordenesLavado.filter((o) => o.clienteId === Number(clienteId));

// --- Integridad referencial (para los DELETE de los otros 4 recursos) ---
const vehiculoTieneOrdenes = (vehiculoId) => ordenesLavado.some((o) => o.vehiculoId === Number(vehiculoId));
const servicioTieneOrdenes = (servicioId) => ordenesLavado.some((o) => o.servicioId === Number(servicioId));
const colaboradorTieneOrdenes = (colaboradorId) => ordenesLavado.some((o) => o.colaboradorId === Number(colaboradorId));
const clienteTieneOrdenes = (clienteId) => ordenesLavado.some((o) => o.clienteId === Number(clienteId));

const vehiculoTieneOrdenAbierta = (vehiculoId, idExcluir) =>
  ordenesLavado.some((o) => o.vehiculoId === Number(vehiculoId) && ESTADOS_ORDEN_ABIERTA.includes(o.estado) && o.id !== idExcluir);

const turnoDuplicado = (fecha, turno, idExcluir) =>
  ordenesLavado.some((o) => o.fecha === fecha && o.turno === turno && o.id !== idExcluir);

// --- Reglas de negocio R1-R8: valida y devuelve los campos finales ---
const _validarYConstruirOrden = (datos, idExcluir = null) => {
  const vehiculo = vehiculosService.obtenerVehiculoPorId(datos.vehiculoId);
  if (!vehiculo) throw new AppError(404, "El vehiculo indicado no existe");

  const servicio = serviciosService.obtenerServicioPorId(datos.servicioId);
  if (!servicio) throw new AppError(404, "El servicio indicado no existe");

  const colaborador = colaboradoresService.obtenerColaboradorPorId(datos.colaboradorId);
  if (!colaborador) throw new AppError(404, "El colaborador indicado no existe"); // R1

  if (colaborador.estado !== "activo") throw new AppError(409, "El colaborador esta inactivo"); // R2
  if (!servicio.activo) throw new AppError(409, "El servicio no esta activo"); // R3

  const valor = serviciosService.obtenerTarifaVigente(servicio, vehiculo.tipoVehiculo);
  if (valor === undefined) {
    throw new AppError(409, `El servicio "${servicio.nombre}" no tiene tarifa para vehiculos tipo ${vehiculo.tipoVehiculo}`); // R3
  }

  if (turnoDuplicado(datos.fecha, datos.turno, idExcluir)) {
    throw new AppError(409, `El turno ${datos.turno} ya esta usado el ${datos.fecha}`); // R5
  }

  if (vehiculoTieneOrdenAbierta(datos.vehiculoId, idExcluir)) {
    throw new AppError(409, "El vehiculo ya tiene una orden registrada o en proceso"); // R6
  }

  const autorizaMotor = Boolean(datos.autorizaMotor);
  if (SERVICIOS_QUE_EXIGEN_AUTORIZACION_MOTOR.includes(servicio.numero) && !autorizaMotor) {
    throw new AppError(409, `El servicio "${servicio.nombre}" exige autorizaMotor: true`); // R7
  }

  let clienteId = null;
  if (datos.medioPago === "credito") {
    const cliente = clientesService.obtenerClientePorId(datos.clienteId);
    if (!cliente) throw new AppError(404, "El cliente indicado no existe"); // R8
    if (cliente.estado !== "activo" || !cliente.tieneCredito) {
      throw new AppError(409, "El cliente no tiene credito habilitado"); // R8
    }
    clienteId = cliente.id;
  }

  return {
    fecha: datos.fecha, turno: datos.turno, vehiculoId: vehiculo.id, servicioId: servicio.id,
    colaboradorId: colaborador.id, valor, medioPago: datos.medioPago, clienteId, autorizaMotor,
    observaciones: datos.observaciones || "",
  };
};

const crearOrden = (datos) => {
  const campos = _validarYConstruirOrden(datos);
  const nuevaOrden = { id: obtenerSiguienteId(), ...campos, estado: "registrada" };
  ordenesLavado.push(nuevaOrden);
  return nuevaOrden;
};

const actualizarOrden = (id, cambios) => {
  const orden = obtenerOrdenPorId(id);
  if (!orden) return null;
  if (ESTADOS_ORDEN_FINALES.includes(orden.estado)) {
    throw new AppError(409, "Una orden entregada o cancelada no se puede modificar"); // R10
  }
  const campos = _validarYConstruirOrden({
    fecha: cambios.fecha ?? orden.fecha,
    turno: cambios.turno ?? orden.turno,
    vehiculoId: cambios.vehiculoId ?? orden.vehiculoId,
    servicioId: cambios.servicioId ?? orden.servicioId,
    colaboradorId: cambios.colaboradorId ?? orden.colaboradorId,
    medioPago: cambios.medioPago ?? orden.medioPago,
    clienteId: cambios.clienteId ?? orden.clienteId,
    autorizaMotor: cambios.autorizaMotor ?? orden.autorizaMotor,
    observaciones: cambios.observaciones ?? orden.observaciones,
  }, id);
  Object.assign(orden, campos);
  return orden;
};

const cambiarEstadoOrden = (id, nuevoEstado) => {
  const orden = obtenerOrdenPorId(id);
  if (!orden) return null;
  const transicionesPermitidas = TRANSICIONES_ESTADO_ORDEN[orden.estado] || [];
  if (!transicionesPermitidas.includes(nuevoEstado)) {
    throw new AppError(409, `No se puede pasar de "${orden.estado}" a "${nuevoEstado}"`); // R9/R10
  }
  orden.estado = nuevoEstado;
  return orden;
};

const eliminarOrden = (id) => {
  const orden = obtenerOrdenPorId(id);
  if (!orden) return null;
  if (ESTADOS_ORDEN_FINALES.includes(orden.estado)) {
    throw new AppError(409, "Una orden entregada o cancelada no se puede eliminar"); // R10
  }
  const indice = ordenesLavado.findIndex((o) => o.id === Number(id));
  const [eliminada] = ordenesLavado.splice(indice, 1);
  return eliminada;
};

module.exports = {
  obtenerOrdenes, obtenerOrdenPorId, obtenerOrdenesPorColaborador, obtenerOrdenesPorCliente,
  vehiculoTieneOrdenes, servicioTieneOrdenes, colaboradorTieneOrdenes, clienteTieneOrdenes,
  crearOrden, actualizarOrden, cambiarEstadoOrden, eliminarOrden,
};