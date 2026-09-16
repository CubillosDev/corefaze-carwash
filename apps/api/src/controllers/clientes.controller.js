const clientesService = require("../services/clientes.service");
const vehiculosService = require("../services/vehiculos.service");
const ordenesLavadoService = require("../services/ordenesLavado.service");

const listarClientes = (req, res) => {
  const { estado } = req.datosValidados;
  return res.status(200).json(clientesService.obtenerClientes({ estado }));
};

const obtenerCliente = (req, res) => {
  const { id } = req.datosValidados;
  const cliente = clientesService.obtenerClientePorId(id);
  if (!cliente) return res.status(404).json({ mensaje: "Cliente no encontrado" });
  return res.status(200).json(cliente);
};

const crearCliente = (req, res) => {
  const nuevoCliente = clientesService.crearCliente(req.datosValidados);
  return res.status(201).json(nuevoCliente);
};

const actualizarCliente = (req, res) => {
  const { id, ...cambios } = req.datosValidados;
  const clienteActualizado = clientesService.actualizarCliente(id, cambios);
  if (!clienteActualizado) return res.status(404).json({ mensaje: "Cliente no encontrado" });
  return res.status(200).json(clienteActualizado);
};

const eliminarCliente = (req, res) => {
  const { id } = req.datosValidados;
  const cliente = clientesService.obtenerClientePorId(id);
  if (!cliente) return res.status(404).json({ mensaje: "Cliente no encontrado" });

  const tieneVehiculos = vehiculosService.clienteTieneVehiculos(id);
  const tieneOrdenes = ordenesLavadoService.clienteTieneOrdenes(id);
  if (tieneVehiculos || tieneOrdenes) {
    return res.status(409).json({ mensaje: "No se puede eliminar el cliente porque tiene vehiculos u ordenes a credito asociadas" });
  }

  const clienteEliminado = clientesService.eliminarCliente(id);
  return res.status(200).json({ mensaje: "Cliente eliminado correctamente", cliente: clienteEliminado });
};

const obtenerCuentasPorCobrar = (req, res) => {
  const { id } = req.datosValidados;
  const cliente = clientesService.obtenerClientePorId(id);
  if (!cliente) return res.status(404).json({ mensaje: "Cliente no encontrado" });

  const ordenes = ordenesLavadoService.obtenerOrdenesPorCliente(id);
  const total = ordenes.reduce((acumulado, orden) => acumulado + orden.valor, 0);
  return res.status(200).json({ cliente, ordenes, total });
};

module.exports = { listarClientes, obtenerCliente, crearCliente, actualizarCliente, eliminarCliente, obtenerCuentasPorCobrar };