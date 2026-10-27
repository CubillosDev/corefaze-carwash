const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const { SolicitudInvalida } = require('../utils/errores');

// parametros_negocio es una tabla de una sola fila: la crea la propia
// migración (id = 1) y la BD le revoca insert/delete incluso a
// service_role (ver supabase/migrations/..._crear_parametros_negocio.sql),
// así que este service nunca crea ni elimina, solo lee y actualiza esa
// fila fija.
const ID_FILA_UNICA = 1;

// Nunca *: así nunca se filtran creado_en/actualizado_en mientras el
// contrato HTTP no las incluya (ver supabase/README.md, "Contrato de
// integración con la API").
const COLUMNAS = [
  'id',
  'nombre_negocio',
  'nit',
  'direccion',
  'telefono',
  'porcentaje_comision',
  'comision_vigente_desde',
  'descontar_comision_diaria',
  'costo_arriendo',
  'costo_luz',
  'costo_agua',
  'costo_nomina_fija',
  'costo_depreciacion',
  'costo_insumos',
  'costo_variable_lavado',
  'precio_promedio_referencia',
  'tope_prestamo_colaborador',
  'dias_operacion_mes',
  'actualizado_por',
].join(', ');

/**
 * Traduce un error de Postgres (vía supabase-js) a una de las clases de
 * utils/errores.js. Los códigos son los que la migración de
 * `parametros_negocio` puede disparar.
 */
const traducirErrorPostgres = (error) => {
  // 23514 check_violation: formato o regla de negocio de parametros_negocio.
  if (error.code === '23514') {
    return new SolicitudInvalida([], 'Datos de parámetros de negocio inválidos');
  }

  return new Error(`Error de base de datos en parametros_negocio: ${error.message}`);
};

/**
 * Obtiene los parámetros de negocio. La fila (id = 1) siempre existe —
 * la crea la propia migración — así que GET /api/parametros nunca
 * debería dar 404 en un entorno correctamente migrado.
 * @returns {Promise<object>}
 */
const obtenerParametros = async () => {
  const { data, error } = await supabase
    .from('parametros_negocio')
    .select(COLUMNAS)
    .eq('id', ID_FILA_UNICA)
    .single();

  if (error) {
    throw new Error(`No se pudo obtener los parámetros de negocio: ${error.message}`);
  }

  return aCamelCase(data);
};

/**
 * Actualiza los parámetros de negocio (fila única, id = 1). Restringido
 * a superadmin — lo exige el middleware de la ruta, no este service. No
 * hay crearParametros ni eliminarParametros (ver comentario de
 * ID_FILA_UNICA arriba).
 *
 * @param {object} datos campos a actualizar (parciales; el que no venga conserva su valor actual)
 * @param {number} usuarioId quién hace el cambio: queda en actualizadoPor y lo lee registrar_auditoria()
 * @returns {Promise<object>}
 */
const actualizarParametros = async (datos, usuarioId) => {
  const actual = await obtenerParametros();

  const cambios = {
    nombre_negocio: datos.nombreNegocio ?? actual.nombreNegocio,
    nit: datos.nit !== undefined ? datos.nit : actual.nit,
    direccion: datos.direccion !== undefined ? datos.direccion : actual.direccion,
    telefono: datos.telefono !== undefined ? datos.telefono : actual.telefono,
    porcentaje_comision: datos.porcentajeComision ?? actual.porcentajeComision,
    comision_vigente_desde: datos.comisionVigenteDesde ?? actual.comisionVigenteDesde,
    descontar_comision_diaria: datos.descontarComisionDiaria ?? actual.descontarComisionDiaria,
    costo_arriendo: datos.costoArriendo ?? actual.costoArriendo,
    costo_luz: datos.costoLuz ?? actual.costoLuz,
    costo_agua: datos.costoAgua ?? actual.costoAgua,
    costo_nomina_fija: datos.costoNominaFija ?? actual.costoNominaFija,
    costo_depreciacion: datos.costoDepreciacion ?? actual.costoDepreciacion,
    costo_insumos: datos.costoInsumos ?? actual.costoInsumos,
    costo_variable_lavado: datos.costoVariableLavado ?? actual.costoVariableLavado,
    precio_promedio_referencia: datos.precioPromedioReferencia ?? actual.precioPromedioReferencia,
    tope_prestamo_colaborador: datos.topePrestamoColaborador ?? actual.topePrestamoColaborador,
    dias_operacion_mes: datos.diasOperacionMes ?? actual.diasOperacionMes,
    actualizado_por: usuarioId,
  };

  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('parametros_negocio')
    .update(cambios)
    .eq('id', ID_FILA_UNICA)
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
};

module.exports = { obtenerParametros, actualizarParametros };
