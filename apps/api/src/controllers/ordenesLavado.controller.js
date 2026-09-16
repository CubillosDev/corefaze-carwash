const ordenesLavadoService = require("../services/ordenesLavado.service");

const listarOrdenes = (req, res) => {
  const { fecha } = req.datosValidados;
  return res.status(200).json(ordenesLavadoService.obtenerOrdenes({ fecha }));
};

const obtenerOrden = (req, res) => {
  const { id } = req.datosValidados;
  const orden = ordenesLavadoService.obtenerOrdenPorId(id);
  if (!orden) return res.status(404).json({ mensaje: "Orden de lavado no encontrada" });
  return res.status(200).json(orden);
};

const crearOrden = (req, res) => {
  const nuevaOrden = ordenesLavadoService.crearOrden(req.datosValidados);
  return res.status(201).json(nuevaOrden);
};

const actualizarOrden = (req, res) => {
  const { id, ...cambios } = req.datosValidados;
  const ordenActualizada = ordenesLavadoService.actualizarOrden(id, cambios);
  if (!ordenActualizada) return res.status(404).json({ mensaje: "Orden de lavado no encontrada" });
  return res.status(200).json(ordenActualizada);
};

const cambiarEstadoOrden = (req, res) => {
  const { id, estado } = req.datosValidados;
  const ordenActualizada = ordenesLavadoService.cambiarEstadoOrden(id, estado);
  if (!ordenActualizada) return res.status(404).json({ mensaje: "Orden de lavado no encontrada" });
  return res.status(200).json(ordenActualizada);
};

const eliminarOrden = (req, res) => {
  const { id } = req.datosValidados;
  const orden = ordenesLavadoService.obtenerOrdenPorId(id);
  if (!orden) return res.status(404).json({ mensaje: "Orden de lavado no encontrada" });

  const ordenEliminada = ordenesLavadoService.eliminarOrden(id);
  return res.status(200).json({ mensaje: "Orden eliminada correctamente", orden: ordenEliminada });
};

module.exports = { listarOrdenes, obtenerOrden, crearOrden, actualizarOrden, cambiarEstadoOrden, eliminarOrden };