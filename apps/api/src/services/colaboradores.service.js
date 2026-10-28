const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const { ESTADOS_ACTIVIDAD, DIAS_GRACIA_CODIGO_COLABORADOR } = require('../constants/dominio');
const { Conflicto, NoEncontrado } = require('../utils/errores');
const { crearTraductorErroresPostgres } = require('../utils/traducirErrorPostgres');

// Nunca *: así nunca se filtran creado_en/actualizado_en mientras el
// contrato HTTP no las incluya (ver supabase/README.md, "Contrato de
// integración con la API").
const COLUMNAS =
  'id, codigo, nombre, documento, telefono, porcentaje_comision, tipo_vinculacion, estado, inactivo_desde';

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
 * La gracia depende de now(), así que esto se valida SIEMPRE aquí, nunca
 * solo en la BD: el índice único parcial (idx_colaboradores_codigo_activo)
 * solo impide dos colaboradores activos con el mismo código, no reasignar
 * uno que sigue en gracia (ver supabase/README.md).
 *
 * @param {number} codigo
 * @param {number|null} [idAExcluir] id del propio colaborador, al actualizar
 * @returns {Promise<boolean>}
 */
const codigoEstaOcupado = async (codigo, idAExcluir = null) => {
  let consulta = supabase
    .from('colaboradores')
    .select('id, estado, inactivo_desde')
    .eq('codigo', codigo);

  if (idAExcluir !== null) {
    consulta = consulta.neq('id', idAExcluir);
  }

  const { data, error } = await consulta;

  if (error) {
    throw new Error(`No se pudo verificar el código del colaborador: ${error.message}`);
  }

  return data.some(
    (colaborador) =>
      colaborador.estado === ESTADOS_ACTIVIDAD.ACTIVO ||
      estaDentroDelPeriodoDeGracia(colaborador.inactivo_desde),
  );
};

/**
 * Traduce un error de Postgres (vía supabase-js) a una de las clases de
 * utils/errores.js. Los códigos son los que la migración de
 * `colaboradores` puede disparar (ver docs/arquitectura/diagramas/modelo-datos.md).
 */
const traducirErrorPostgres = crearTraductorErroresPostgres({
  tabla: 'colaboradores',
  etiqueta: 'colaborador',
  mapeo: {
    // 23505 unique_violation: dos posibles índices únicos.
    23505: (error) =>
      error.message.includes('idx_colaboradores_codigo_activo')
        ? new Conflicto('Ese código pertenece a un colaborador activo o en período de gracia')
        : // colaboradores_documento_key
          new Conflicto('Ya existe un colaborador con ese documento'),
    // 23503 foreign_key_violation al borrar: ordenes_lavado.colaborador_id (restrict).
    23503: () =>
      new Conflicto('No se puede eliminar un colaborador con órdenes de lavado asociadas'),
  },
});

/**
 * Lista todos los colaboradores.
 * @returns {Promise<object[]>}
 */
const listarColaboradores = async () => {
  const { data, error } = await supabase.from('colaboradores').select(COLUMNAS);

  if (error) {
    throw new Error(`No se pudo listar colaboradores: ${error.message}`);
  }

  return aCamelCase(data);
};

/**
 * Obtiene un colaborador por id.
 * @param {number|string} id
 * @returns {Promise<object | null>}
 */
const obtenerColaboradorPorId = async (id) => {
  const { data, error } = await supabase
    .from('colaboradores')
    .select(COLUMNAS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener el colaborador: ${error.message}`);
  }

  return data ? aCamelCase(data) : null;
};

/**
 * Obtiene un colaborador por id, o lanza NoEncontrado (404).
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NoEncontrado}
 */
const obtenerColaboradorOFallar = async (id) => {
  const colaborador = await obtenerColaboradorPorId(id);
  if (!colaborador) {
    throw new NoEncontrado('Colaborador no encontrado');
  }
  return colaborador;
};

/**
 * Crea un colaborador nuevo.
 *
 * Reglas de negocio:
 * - El código está "ocupado" si pertenece a alguien activo, o a alguien
 *   inactivo dentro de su período de gracia de 15 días (409 si ocupado) —
 *   lo valida codigoEstaOcupado, nunca solo la BD.
 * - El documento es único para siempre, sin importar el estado (409 si
 *   existe) — lo rechaza el UNIQUE de la BD, traducido por traducirErrorPostgres.
 * - Todo colaborador nuevo nace "activo", con inactivoDesde en null
 *   (defaults de las columnas).
 *
 * @param {{ codigo: number, nombre: string, documento: string, telefono: string, porcentajeComision: number, tipoVinculacion: string }} datos
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} el colaborador creado
 */
const crearColaborador = async (datos, usuarioId) => {
  if (await codigoEstaOcupado(datos.codigo)) {
    throw new Conflicto('Ese código pertenece a un colaborador activo o en período de gracia');
  }

  const fila = {
    codigo: datos.codigo,
    nombre: datos.nombre,
    documento: datos.documento,
    telefono: datos.telefono,
    porcentaje_comision: datos.porcentajeComision,
    tipo_vinculacion: datos.tipoVinculacion,
  };

  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('colaboradores')
    .insert(fila)
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
};

/**
 * Actualiza un colaborador existente. Si el cambio de estado lo pasa a
 * "inactivo", registra inactivoDesde (arranca el período de gracia). Si lo
 * reactiva a "activo" (la misma persona vuelve), limpia inactivoDesde.
 *
 * @param {number|string} id
 * @param {{ codigo?: number, nombre?: string, documento?: string, telefono?: string, porcentajeComision?: number, tipoVinculacion?: string, estado?: string }} datos
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} el colaborador actualizado
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si el código o documento nuevos ya pertenecen a otro colaborador
 */
const actualizarColaborador = async (id, datos, usuarioId) => {
  const colaboradorActual = await obtenerColaboradorOFallar(id);

  if (datos.codigo !== undefined && Number(datos.codigo) !== colaboradorActual.codigo) {
    if (await codigoEstaOcupado(datos.codigo, id)) {
      throw new Conflicto('Ese código pertenece a un colaborador activo o en período de gracia');
    }
  }

  let inactivoDesde = colaboradorActual.inactivoDesde;
  if (datos.estado && datos.estado !== colaboradorActual.estado) {
    inactivoDesde = datos.estado === ESTADOS_ACTIVIDAD.INACTIVO ? new Date().toISOString() : null;
  }

  const cambios = {
    codigo: datos.codigo !== undefined ? Number(datos.codigo) : colaboradorActual.codigo,
    nombre: datos.nombre ?? colaboradorActual.nombre,
    documento: datos.documento ?? colaboradorActual.documento,
    telefono: datos.telefono ?? colaboradorActual.telefono,
    porcentaje_comision: datos.porcentajeComision ?? colaboradorActual.porcentajeComision,
    tipo_vinculacion: datos.tipoVinculacion ?? colaboradorActual.tipoVinculacion,
    estado: datos.estado ?? colaboradorActual.estado,
    inactivo_desde: inactivoDesde,
  };

  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('colaboradores')
    .update(cambios)
    .eq('id', id)
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
};

/**
 * Cambia únicamente el estado de un colaborador (PATCH dedicado), con la
 * misma lógica de inactivoDesde que actualizarColaborador.
 *
 * @param {number|string} id
 * @param {string} estado
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} el colaborador actualizado
 * @throws {NoEncontrado} si el id no existe
 */
const cambiarEstadoColaborador = (id, estado, usuarioId) =>
  actualizarColaborador(id, { estado }, usuarioId);

/**
 * Elimina un colaborador por id.
 *
 * La verificación de "no tiene órdenes" (409) vive primero en el
 * controller, llamando a ordenesLavadoService.colaboradorTieneOrdenes(id).
 * La FK ordenes_lavado.colaborador_id (restrict) es la defensa adicional
 * si esa verificación quedó desactualizada.
 *
 * @param {number|string} id
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @throws {NoEncontrado} si el id no existe
 */
const eliminarColaborador = async (id, usuarioId) => {
  await obtenerColaboradorOFallar(id);

  const { error } = await crearClienteConUsuario(usuarioId)
    .from('colaboradores')
    .delete()
    .eq('id', id);

  if (error) {
    throw traducirErrorPostgres(error);
  }
};

module.exports = {
  listarColaboradores,
  obtenerColaboradorPorId,
  obtenerColaboradorOFallar,
  crearColaborador,
  actualizarColaborador,
  cambiarEstadoColaborador,
  eliminarColaborador,
};
