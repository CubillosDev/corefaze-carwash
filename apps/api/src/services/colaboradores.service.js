const { colaboradores, obtenerSiguienteId } = require("../data/colaboradores");
const { combinarCampos } = require("../utils/mapearCampos");
const AppError = require("../utils/AppError");

const obtenerColaboradores = (filtros = {}) => {
  if (filtros.estado) return colaboradores.filter((c) => c.estado === filtros.estado);
  return colaboradores;
};

const obtenerColaboradorPorId = (id) => colaboradores.find((c) => c.id === Number(id));
const obtenerColaboradorPorCodigo = (codigo) => colaboradores.find((c) => c.codigo === codigo);

const crearColaborador = (datos) => {
  if (obtenerColaboradorPorCodigo(datos.codigo)) {
    throw new AppError(409, `Ya existe un colaborador con el codigo ${datos.codigo}`);
  }
  const nuevoColaborador = {
    id: obtenerSiguienteId(),
    codigo: datos.codigo,
    nombre: datos.nombre,
    telefono: datos.telefono,
    porcentajeComision: datos.porcentajeComision,
    estado: "activo",
  };
  colaboradores.push(nuevoColaborador);
  return nuevoColaborador;
};

const actualizarColaborador = (id, cambios) => {
  const colaborador = obtenerColaboradorPorId(id);
  if (!colaborador) return null;

  if (cambios.codigo && cambios.codigo !== colaborador.codigo) {
    const otro = obtenerColaboradorPorCodigo(cambios.codigo);
    if (otro) throw new AppError(409, `Ya existe un colaborador con el codigo ${cambios.codigo}`);
  }

  const actualizado = combinarCampos(colaborador, {
    codigo: cambios.codigo,
    nombre: cambios.nombre,
    telefono: cambios.telefono,
    porcentajeComision: cambios.porcentajeComision,
  });
  Object.assign(colaborador, actualizado);
  return colaborador;
};

const cambiarEstadoColaborador = (id, estado) => {
  const colaborador = obtenerColaboradorPorId(id);
  if (!colaborador) return null;
  colaborador.estado = estado;
  return colaborador;
};

const eliminarColaborador = (id) => {
  const indice = colaboradores.findIndex((c) => c.id === Number(id));
  if (indice === -1) return null;
  const [eliminado] = colaboradores.splice(indice, 1);
  return eliminado;
};

module.exports = {
  obtenerColaboradores, obtenerColaboradorPorId, obtenerColaboradorPorCodigo,
  crearColaborador, actualizarColaborador, cambiarEstadoColaborador, eliminarColaborador,
};