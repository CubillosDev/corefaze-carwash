const colaboradoresService = require("../services/colaboradores.service");
const ordenesLavadoService = require("../services/ordenesLavado.service");

const listarColaboradores = (req, res) => {
  const { estado } = req.datosValidados;
  return res.status(200).json(colaboradoresService.obtenerColaboradores({ estado }));
};

const obtenerColaborador = (req, res) => {
  const { id } = req.datosValidados;
  const colaborador = colaboradoresService.obtenerColaboradorPorId(id);
  if (!colaborador) return res.status(404).json({ mensaje: "Colaborador no encontrado" });
  return res.status(200).json(colaborador);
};

const crearColaborador = (req, res) => {
  const nuevoColaborador = colaboradoresService.crearColaborador(req.datosValidados);
  return res.status(201).json(nuevoColaborador);
};

const actualizarColaborador = (req, res) => {
  const { id, ...cambios } = req.datosValidados;
  const colaboradorActualizado = colaboradoresService.actualizarColaborador(id, cambios);
  if (!colaboradorActualizado) return res.status(404).json({ mensaje: "Colaborador no encontrado" });
  return res.status(200).json(colaboradorActualizado);
};

const cambiarEstadoColaborador = (req, res) => {
  const { id, estado } = req.datosValidados;
  const colaboradorActualizado = colaboradoresService.cambiarEstadoColaborador(id, estado);
  if (!colaboradorActualizado) return res.status(404).json({ mensaje: "Colaborador no encontrado" });
  return res.status(200).json(colaboradorActualizado);
};

const eliminarColaborador = (req, res) => {
  const { id } = req.datosValidados;
  const colaborador = colaboradoresService.obtenerColaboradorPorId(id);
  if (!colaborador) return res.status(404).json({ mensaje: "Colaborador no encontrado" });

  if (ordenesLavadoService.colaboradorTieneOrdenes(id)) {
    return res.status(409).json({ mensaje: "No se puede eliminar el colaborador porque tiene ordenes asociadas" });
  }

  const colaboradorEliminado = colaboradoresService.eliminarColaborador(id);
  return res.status(200).json({ mensaje: "Colaborador eliminado correctamente", colaborador: colaboradorEliminado });
};

const obtenerLiquidacion = (req, res) => {
  const { id, fecha } = req.datosValidados;
  const colaborador = colaboradoresService.obtenerColaboradorPorId(id);
  if (!colaborador) return res.status(404).json({ mensaje: "Colaborador no encontrado" });

  const ordenes = ordenesLavadoService.obtenerOrdenesPorColaborador(id, fecha);
  const totalComision = ordenes
    .filter((orden) => orden.estado === "entregada")
    .reduce((acumulado, orden) => acumulado + orden.valor * colaborador.porcentajeComision, 0);

  return res.status(200).json({ colaborador, fecha: fecha || null, ordenes, totalComision });
};

module.exports = { listarColaboradores, obtenerColaborador, crearColaborador, actualizarColaborador, cambiarEstadoColaborador, eliminarColaborador, obtenerLiquidacion };