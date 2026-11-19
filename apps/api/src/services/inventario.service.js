const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');
const { crearTraductorErroresPostgres } = require('../utils/traducirErrorPostgres');

const COLUMNAS_INSUMO =
  'id, nombre, categoria, unidad, stock, stock_minimo, estado, actualizado_en';
const COLUMNAS_MOVIMIENTO =
  'id, insumo_id, cantidad, stock_resultante, observacion, registrado_por, creado_en';
const MOVIMIENTOS_RECIENTES = 50;

const traducirErrorPostgres = crearTraductorErroresPostgres({
  tabla: 'insumos',
  etiqueta: 'insumo',
  mapeo: {
    23505: () => new Conflicto('Ya existe un insumo con ese nombre'),
    23514: (error) =>
      error.message.includes('violates check constraint')
        ? new SolicitudInvalida([], 'Datos de insumo inválidos')
        : new Conflicto(error.message),
    P0002: (error) => new NoEncontrado(error.message),
  },
});

/** El aviso de stock bajo lo decide el servidor, con el mínimo de cada insumo. */
const conAviso = (insumo) => ({ ...insumo, stockBajo: insumo.stock < insumo.stockMinimo });

const consultar = async (consulta, contexto) => {
  const { data, error } = await consulta;
  if (error) {
    throw new Error(`No se pudo consultar ${contexto}: ${error.message}`);
  }
  return aCamelCase(data);
};

const obtenerInsumoOFallar = async (id) => {
  const insumo = await consultar(
    supabase.from('insumos').select(COLUMNAS_INSUMO).eq('id', id).maybeSingle(),
    'el insumo',
  );
  if (!insumo) {
    throw new NoEncontrado('Insumo no encontrado');
  }
  return conAviso(insumo);
};

/** Todos los insumos, por categoría y nombre, con su aviso de stock bajo. */
const listarInsumos = async () => {
  const insumos = await consultar(
    supabase.from('insumos').select(COLUMNAS_INSUMO).order('categoria').order('nombre'),
    'los insumos',
  );
  return insumos.map(conAviso);
};

const moverStock = async (id, cantidad, observacion, usuarioId) => {
  const { error } = await crearClienteConUsuario(usuarioId).rpc('registrar_movimiento_inventario', {
    p_insumo_id: id,
    p_cantidad: cantidad,
    p_observacion: observacion,
    p_usuario_id: usuarioId,
  });
  if (error) {
    throw traducirErrorPostgres(error);
  }
};

/** Crea un insumo; el stock inicial entra como primer movimiento. */
const crearInsumo = async (
  { nombre, categoria, unidad, stockMinimo, stockInicial = 0 },
  usuarioId,
) => {
  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('insumos')
    .insert({ nombre, categoria, unidad, stock_minimo: stockMinimo })
    .select('id')
    .single();
  if (error) {
    throw traducirErrorPostgres(error);
  }
  if (stockInicial > 0) {
    await moverStock(data.id, stockInicial, 'Stock inicial', usuarioId);
  }
  return obtenerInsumoOFallar(data.id);
};

/** Edita los datos de un insumo; el stock solo cambia con movimientos. */
const actualizarInsumo = async (id, { nombre, categoria, unidad, stockMinimo }, usuarioId) => {
  await obtenerInsumoOFallar(id);
  const { error } = await crearClienteConUsuario(usuarioId)
    .from('insumos')
    .update({ nombre, categoria, unidad, stock_minimo: stockMinimo })
    .eq('id', id);
  if (error) {
    throw traducirErrorPostgres(error);
  }
  return obtenerInsumoOFallar(id);
};

/** Activa o desactiva un insumo (no se borra). */
const cambiarEstado = async (id, estado, usuarioId) => {
  await obtenerInsumoOFallar(id);
  const { error } = await crearClienteConUsuario(usuarioId)
    .from('insumos')
    .update({ estado })
    .eq('id', id);
  if (error) {
    throw traducirErrorPostgres(error);
  }
  return obtenerInsumoOFallar(id);
};

/** Suma o resta unidades (los botones − y + del diseño) y deja el movimiento. */
const registrarMovimiento = async (id, { cantidad, observacion = null }, usuarioId) => {
  await obtenerInsumoOFallar(id);
  await moverStock(id, cantidad, observacion, usuarioId);
  return obtenerInsumoOFallar(id);
};

/** Últimos movimientos de un insumo. */
const listarMovimientos = async (id) => {
  await obtenerInsumoOFallar(id);
  return consultar(
    supabase
      .from('movimientos_inventario')
      .select(COLUMNAS_MOVIMIENTO)
      .eq('insumo_id', id)
      .order('creado_en', { ascending: false })
      .limit(MOVIMIENTOS_RECIENTES),
    'los movimientos',
  );
};

module.exports = {
  listarInsumos,
  obtenerInsumoOFallar,
  crearInsumo,
  actualizarInsumo,
  cambiarEstado,
  registrarMovimiento,
  listarMovimientos,
};
