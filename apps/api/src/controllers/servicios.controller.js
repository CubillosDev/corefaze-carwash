const serviciosService = require("../services/servicios.service");
const ordenesLavadoService = require("../services/ordenesLavado.service");

const listarServicios = (req, res) => {
  const { activo } = req.datosValidados;
  return res.status(200).json(serviciosService.obtenerServicios({ activo }));
};

const obtenerServicio = (req, res) => {
  const { id } = req.datosValidados;
  const servicio = serviciosService.obtenerServicioPorId(id);
  if (!servicio) return res.status(404).json({ mensaje: "Servicio no encontrado" });
  return res.status(200).json(servicio);
};

const crearServicio = (req, res) => {
  const nuevoServicio = serviciosService.crearServicio(req.datosValidados);
  return res.status(201).json(nuevoServicio);
};

const actualizarServicio = (req, res) => {
  const { id, ...cambios } = req.datosValidados;
  const servicioActualizado = serviciosService.actualizarServicio(id, cambios);
  if (!servicioActualizado) return res.status(404).json({ mensaje: "Servicio no encontrado" });
  return res.status(200).json(servicioActualizado);
};

const eliminarServicio = (req, res) => {
  const { id } = req.datosValidados;
  const servicio = serviciosService.obtenerServicioPorId(id);
  if (!servicio) return res.status(404).json({ mensaje: "Servicio no encontrado" });

  if (ordenesLavadoService.servicioTieneOrdenes(id)) {
    return res.status(409).json({ mensaje: "No se puede eliminar el servicio porque tiene ordenes asociadas" });
  }

  const servicioEliminado = serviciosService.eliminarServicio(id);
  return res.status(200).json({ mensaje: "Servicio eliminado correctamente", servicio: servicioEliminado });
};

module.exports = { listarServicios, obtenerServicio, crearServicio, actualizarServicio, eliminarServicio };