const colaboradores = require('../data/colaboradores');
const { ESTADOS_ACTIVIDAD, DIAS_GRACIA_CODIGO_COLABORADOR } = require('../constants/dominio');
const { Conflicto, NoEncontrado } = require('../utils/errores');

const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * ¿Un colaborador inactivo sigue dentro de su período de gracia? Mientras
 * dure, su código permanece reservado y no se le puede dar a otra persona.
 *
 * @param {string|null} inactivoDesde
 * @returns {boolean}
 */
const estaDentroDelPeriodoDeGracia = (inactivoDesde) => {
  if (!inactivoDesde) {
    return false;
  }
  const milisegundosTranscurridos = Date.now() - new Date(inactivoDesde).getTime();
  const diasTranscurridos = Math.floor(milisegundosTranscurridos / MILISEGUNDOS_POR_DIA);
  return diasTranscurridos <= DIAS_GRACIA_CODIGO_COLABORADOR;
};

/**
 * Un código está ocupado si pertenece a un colaborador activo, o a uno
 * inactivo que todavía está dentro de su período de gracia (15 días).
 * Pasado ese tiempo, el código queda libre para una persona nueva.
 *
 * @param {number} codigo
 * @param {number|null} [idAExcluir] id del propio colaborador, al actualizar
 * @returns {boolean}
 */
const codigoEstaOcupado = (codigo, idAExcluir = null) =>
  colaboradores.some(
    (colaborador) =>
      colaborador.codigo === Number(codigo) &&
      colaborador.id !== idAExcluir &&
      (colaborador.estado === ESTADOS_ACTIVIDAD.ACTIVO ||
        estaDentroDelPeriodoDeGracia(colaborador.inactivoDesde)),
  );

/**
 * El documento (cédula) identifica a la persona real y es único para
 * siempre, sin importar su estado — a diferencia del código, que es un
 * "cupo" reasignable. Si alguien vuelve, se reactiva su propio registro
 * en vez de crear uno nuevo con el mismo documento.
 *
 * @param {string} documento
 * @returns {object | undefined}
 */
const buscarPorDocumento = (documento) =>
  colaboradores.find((colaborador) => colaborador.documento === documento);

/**
 * Lista todos los colaboradores.
 * @returns {object[]}
 */
const listarColaboradores = () => colaboradores;

/**
 * Obtiene un colaborador por id.
 * @param {number|string} id
 * @returns {object | null}
 */
const obtenerColaboradorPorId = (id) => {
  const colaborador = colaboradores.find((candidato) => candidato.id === Number(id));
  return colaborador ?? null;
};

/**
 * Obtiene un colaborador por id, o lanza NoEncontrado (404).
 * @param {number|string} id
 * @returns {object}
 * @throws {NoEncontrado}
 */
const obtenerColaboradorOFallar = (id) => {
  const colaborador = obtenerColaboradorPorId(id);
  if (!colaborador) {
    throw new NoEncontrado('Colaborador no encontrado');
  }
  return colaborador;
};

/**
 * Integridad referencial (patrón <entidad>Tiene<Relacion>() del estándar):
 * se conecta aquí cuando exista ordenesLavado.service.js, que es quien
 * tiene la llave foránea colaboradorId.
 *
 * TODO(ordenesLavado): reemplazar este placeholder por la llamada real:
 *   return ordenesLavadoService.colaboradorTieneOrdenes(colaboradorId);
 * Hasta entonces, nunca bloquea la eliminación (siempre false).
 *
 * @param {number|string} _colaboradorId
 * @returns {boolean}
 */
const colaboradorTieneOrdenes = (_colaboradorId) => false;

/**
 * Crea un colaborador nuevo.
 *
 * Reglas de negocio:
 * - El código está "ocupado" si pertenece a alguien activo, o a alguien
 *   inactivo dentro de su período de gracia de 15 días (409 si ocupado).
 * - El documento es único para siempre, sin importar el estado (409 si existe).
 * - Todo colaborador nuevo nace "activo", con inactivoDesde en null.
 *
 * @param {{ codigo: number, nombre: string, documento: string, telefono: string, porcentajeComision: number, tipoVinculacion: string }} datos
 * @returns {object} el colaborador creado
 */
const crearColaborador = (datos) => {
  if (codigoEstaOcupado(datos.codigo)) {
    throw new Conflicto('Ese código pertenece a un colaborador activo o en período de gracia');
  }

  if (buscarPorDocumento(datos.documento)) {
    throw new Conflicto('Ya existe un colaborador con ese documento');
  }

  const nuevoColaborador = {
    id: colaboradores.length > 0 ? Math.max(...colaboradores.map((c) => c.id)) + 1 : 1,
    codigo: Number(datos.codigo),
    nombre: datos.nombre,
    documento: datos.documento,
    telefono: datos.telefono,
    porcentajeComision: datos.porcentajeComision,
    tipoVinculacion: datos.tipoVinculacion,
    estado: ESTADOS_ACTIVIDAD.ACTIVO,
    inactivoDesde: null,
  };

  colaboradores.push(nuevoColaborador);
  return nuevoColaborador;
};

/**
 * Actualiza un colaborador existente. Si el cambio de estado lo pasa a
 * "inactivo", registra inactivoDesde (arranca el período de gracia). Si lo
 * reactiva a "activo" (la misma persona vuelve), limpia inactivoDesde.
 *
 * @param {number|string} id
 * @param {{ codigo?: number, nombre?: string, documento?: string, telefono?: string, porcentajeComision?: number, tipoVinculacion?: string, estado?: string }} datos
 * @returns {object} el colaborador actualizado
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si el código o documento nuevos ya pertenecen a otro colaborador
 */
const actualizarColaborador = (id, datos) => {
  const colaborador = obtenerColaboradorOFallar(id);

  if (datos.codigo !== undefined && Number(datos.codigo) !== colaborador.codigo) {
    if (codigoEstaOcupado(datos.codigo, colaborador.id)) {
      throw new Conflicto('Ese código pertenece a un colaborador activo o en período de gracia');
    }
  }

  if (datos.documento && datos.documento !== colaborador.documento) {
    if (buscarPorDocumento(datos.documento)) {
      throw new Conflicto('Ya existe un colaborador con ese documento');
    }
  }

  let inactivoDesde = colaborador.inactivoDesde;
  if (datos.estado && datos.estado !== colaborador.estado) {
    inactivoDesde = datos.estado === ESTADOS_ACTIVIDAD.INACTIVO ? new Date().toISOString() : null;
  }

  Object.assign(colaborador, {
    codigo: datos.codigo !== undefined ? Number(datos.codigo) : colaborador.codigo,
    nombre: datos.nombre ?? colaborador.nombre,
    documento: datos.documento ?? colaborador.documento,
    telefono: datos.telefono ?? colaborador.telefono,
    porcentajeComision: datos.porcentajeComision ?? colaborador.porcentajeComision,
    tipoVinculacion: datos.tipoVinculacion ?? colaborador.tipoVinculacion,
    estado: datos.estado ?? colaborador.estado,
    inactivoDesde,
  });

  return colaborador;
};

/**
 * Cambia únicamente el estado de un colaborador (PATCH dedicado), con la
 * misma lógica de inactivoDesde que actualizarColaborador.
 *
 * @param {number|string} id
 * @param {string} estado
 * @returns {object} el colaborador actualizado
 * @throws {NoEncontrado} si el id no existe
 */
const cambiarEstadoColaborador = (id, estado) => actualizarColaborador(id, { estado });

/**
 * Elimina un colaborador por id.
 * No se puede eliminar un colaborador con órdenes asociadas (409).
 *
 * @param {number|string} id
 * @throws {NoEncontrado} si el id no existe
 */
const eliminarColaborador = (id) => {
  const colaborador = obtenerColaboradorOFallar(id);
  const indice = colaboradores.indexOf(colaborador);
  colaboradores.splice(indice, 1);
};

module.exports = {
  listarColaboradores,
  obtenerColaboradorPorId,
  obtenerColaboradorOFallar,
  colaboradorTieneOrdenes,
  crearColaborador,
  actualizarColaborador,
  cambiarEstadoColaborador,
  eliminarColaborador,
};
