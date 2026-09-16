const { clientes, obtenerSiguienteId } = require("../data/clientes");
const { combinarCampos } = require("../utils/mapearCampos");
const AppError = require("../utils/AppError");

const obtenerClientes = (filtros = {}) => {
  if (filtros.estado) return clientes.filter((c) => c.estado === filtros.estado);
  return clientes;
};

const obtenerClientePorId = (id) => clientes.find((c) => c.id === Number(id));
const obtenerClientePorDocumento = (documento) => clientes.find((c) => c.documento === documento);

const crearCliente = (datos) => {
  if (obtenerClientePorDocumento(datos.documento)) {
    throw new AppError(409, `Ya existe un cliente con el documento ${datos.documento}`);
  }
  const nuevoCliente = {
    id: obtenerSiguienteId(),
    nombre: datos.nombre,
    documento: datos.documento,
    telefono: datos.telefono,
    tieneCredito: datos.tieneCredito ?? false,
    estado: "activo",
  };
  clientes.push(nuevoCliente);
  return nuevoCliente;
};

const actualizarCliente = (id, cambios) => {
  const cliente = obtenerClientePorId(id);
  if (!cliente) return null;

  if (cambios.documento && cambios.documento !== cliente.documento) {
    const otro = obtenerClientePorDocumento(cambios.documento);
    if (otro) throw new AppError(409, `Ya existe un cliente con el documento ${cambios.documento}`);
  }

  const actualizado = combinarCampos(cliente, {
    nombre: cambios.nombre,
    documento: cambios.documento,
    telefono: cambios.telefono,
    tieneCredito: cambios.tieneCredito,
    estado: cambios.estado,
  });
  Object.assign(cliente, actualizado);
  return cliente;
};

const eliminarCliente = (id) => {
  const indice = clientes.findIndex((c) => c.id === Number(id));
  if (indice === -1) return null;
  const [eliminado] = clientes.splice(indice, 1);
  return eliminado;
};

module.exports = {
  obtenerClientes, obtenerClientePorId, obtenerClientePorDocumento,
  crearCliente, actualizarCliente, eliminarCliente,
};