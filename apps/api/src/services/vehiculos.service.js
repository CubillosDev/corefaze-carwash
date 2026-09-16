const { vehiculos, obtenerSiguienteId } = require("../data/vehiculos");
const { combinarCampos } = require("../utils/mapearCampos");
const AppError = require("../utils/AppError");

const obtenerVehiculos = (filtros = {}) => {
  if (filtros.placa) return vehiculos.filter((v) => v.placa === filtros.placa);
  return vehiculos;
};

const obtenerVehiculoPorId = (id) => vehiculos.find((v) => v.id === Number(id));
const obtenerVehiculoPorPlaca = (placa) => vehiculos.find((v) => v.placa === placa);
const clienteTieneVehiculos = (clienteId) => vehiculos.some((v) => v.clienteId === Number(clienteId));

const crearVehiculo = (datos) => {
  if (obtenerVehiculoPorPlaca(datos.placa)) {
    throw new AppError(409, `Ya existe un vehiculo con la placa ${datos.placa}`);
  }
  const nuevoVehiculo = {
    id: obtenerSiguienteId(),
    placa: datos.placa,
    tipoVehiculo: datos.tipoVehiculo,
    marca: datos.marca ?? null,
    color: datos.color ?? null,
    clienteId: datos.clienteId ?? null,
  };
  vehiculos.push(nuevoVehiculo);
  return nuevoVehiculo;
};

const actualizarVehiculo = (id, cambios) => {
  const vehiculo = obtenerVehiculoPorId(id);
  if (!vehiculo) return null;

  if (cambios.placa && cambios.placa !== vehiculo.placa) {
    const otro = obtenerVehiculoPorPlaca(cambios.placa);
    if (otro) throw new AppError(409, `Ya existe un vehiculo con la placa ${cambios.placa}`);
  }

  const actualizado = combinarCampos(vehiculo, {
    placa: cambios.placa,
    tipoVehiculo: cambios.tipoVehiculo,
    marca: cambios.marca,
    color: cambios.color,
    clienteId: cambios.clienteId,
  });
  Object.assign(vehiculo, actualizado);
  return vehiculo;
};

const eliminarVehiculo = (id) => {
  const indice = vehiculos.findIndex((v) => v.id === Number(id));
  if (indice === -1) return null;
  const [eliminado] = vehiculos.splice(indice, 1);
  return eliminado;
};

module.exports = {
  obtenerVehiculos, obtenerVehiculoPorId, obtenerVehiculoPorPlaca, clienteTieneVehiculos,
  crearVehiculo, actualizarVehiculo, eliminarVehiculo,
};