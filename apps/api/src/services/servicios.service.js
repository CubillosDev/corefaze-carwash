const { servicios, obtenerSiguienteId } = require("../data/servicios");
const { combinarCampos } = require("../utils/mapearCampos");
const AppError = require("../utils/AppError");

const obtenerServicios = (filtros = {}) => {
  if (filtros.activo !== undefined) return servicios.filter((s) => s.activo === filtros.activo);
  return servicios;
};

const obtenerServicioPorId = (id) => servicios.find((s) => s.id === Number(id));
const obtenerServicioPorNumero = (numero) => servicios.find((s) => s.numero === numero);

// Tarifa vigente del servicio para un tipo de vehiculo, o undefined si no aplica (R3).
const obtenerTarifaVigente = (servicio, tipoVehiculo) => {
  const tarifa = servicio.tarifas.find((t) => t.tipoVehiculo === tipoVehiculo);
  return tarifa ? tarifa.valor : undefined;
};

const crearServicio = (datos) => {
  if (obtenerServicioPorNumero(datos.numero)) {
    throw new AppError(409, `Ya existe un servicio con el numero ${datos.numero}`);
  }
  const nuevoServicio = {
    id: obtenerSiguienteId(),
    numero: datos.numero,
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    categoria: datos.categoria,
    tarifas: datos.tarifas,
    activo: true,
  };
  servicios.push(nuevoServicio);
  return nuevoServicio;
};

const actualizarServicio = (id, cambios) => {
  const servicio = obtenerServicioPorId(id);
  if (!servicio) return null;

  if (cambios.numero && cambios.numero !== servicio.numero) {
    const otro = obtenerServicioPorNumero(cambios.numero);
    if (otro) throw new AppError(409, `Ya existe un servicio con el numero ${cambios.numero}`);
  }

  const actualizado = combinarCampos(servicio, {
    numero: cambios.numero,
    nombre: cambios.nombre,
    descripcion: cambios.descripcion,
    categoria: cambios.categoria,
    tarifas: cambios.tarifas,
    activo: cambios.activo,
  });
  Object.assign(servicio, actualizado);
  return servicio;
};

const eliminarServicio = (id) => {
  const indice = servicios.findIndex((s) => s.id === Number(id));
  if (indice === -1) return null;
  const [eliminado] = servicios.splice(indice, 1);
  return eliminado;
};

module.exports = {
  obtenerServicios, obtenerServicioPorId, obtenerServicioPorNumero, obtenerTarifaVigente,
  crearServicio, actualizarServicio, eliminarServicio,
};