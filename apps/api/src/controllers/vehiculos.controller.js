const vehiculosService = require("../services/vehiculos.service");
const ordenesLavadoService = require("../services/ordenesLavado.service");

const listarVehiculos = (req, res) => {
  const { placa } = req.datosValidados;
  return res.status(200).json(vehiculosService.obtenerVehiculos({ placa }));
};

const obtenerVehiculo = (req, res) => {
  const { id } = req.datosValidados;
  const vehiculo = vehiculosService.obtenerVehiculoPorId(id);
  if (!vehiculo) return res.status(404).json({ mensaje: "Vehiculo no encontrado" });
  return res.status(200).json(vehiculo);
};

const crearVehiculo = (req, res) => {
  const nuevoVehiculo = vehiculosService.crearVehiculo(req.datosValidados);
  return res.status(201).json(nuevoVehiculo);
};

const actualizarVehiculo = (req, res) => {
  const { id, ...cambios } = req.datosValidados;
  const vehiculoActualizado = vehiculosService.actualizarVehiculo(id, cambios);
  if (!vehiculoActualizado) return res.status(404).json({ mensaje: "Vehiculo no encontrado" });
  return res.status(200).json(vehiculoActualizado);
};

const eliminarVehiculo = (req, res) => {
  const { id } = req.datosValidados;
  const vehiculo = vehiculosService.obtenerVehiculoPorId(id);
  if (!vehiculo) return res.status(404).json({ mensaje: "Vehiculo no encontrado" });

  if (ordenesLavadoService.vehiculoTieneOrdenes(id)) {
    return res.status(409).json({ mensaje: "No se puede eliminar el vehiculo porque tiene ordenes asociadas" });
  }

  const vehiculoEliminado = vehiculosService.eliminarVehiculo(id);
  return res.status(200).json({ mensaje: "Vehiculo eliminado correctamente", vehiculo: vehiculoEliminado });
};

module.exports = { listarVehiculos, obtenerVehiculo, crearVehiculo, actualizarVehiculo, eliminarVehiculo };