const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const { SERVICIOS_CON_LAVADO_MOTOR } = require('../constants/dominio');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');

// Nunca *: así nunca se filtran creado_en/actualizado_en mientras el
// contrato HTTP no las incluya. El alias de tarifas es el select anidado
// documentado en el contrato de integración (supabase/README.md): la API
// sigue devolviendo tarifas como parte del servicio, aunque en la BD es
// una tabla aparte (tarifas_servicio), 1 a N, borrada en cascada con su servicio.
const COLUMNAS =
  'id, numero, nombre, descripcion, categoria, activo, tarifas:tarifas_servicio(tipo_vehiculo, valor)';

/**
 * R3: dentro de un mismo servicio no puede haber dos tarifas para el
 * mismo tipo de vehículo (sería ambiguo cuál aplica).
 *
 * @param {Array<{ tipoVehiculo: string, valor: number }>} tarifas
 * @returns {boolean}
 */
const tieneTipoVehiculoDuplicado = (tarifas) => {
  const tipos = tarifas.map((tarifa) => tarifa.tipoVehiculo);
  return new Set(tipos).size !== tipos.length;
};

/**
 * Defensa en profundidad: aunque el validador ya debería atrapar
 * duplicados de tipoVehiculo en tarifas, el service lo vuelve a exigir
 * antes de persistir — con un mensaje de campo específico, mejor que el
 * 23505 genérico que dejaría el UNIQUE (servicio_id, tipo_vehiculo) de la BD.
 *
 * @param {Array<{ tipoVehiculo: string, valor: number }>} tarifas
 * @throws {SolicitudInvalida} si hay un tipoVehiculo repetido
 */
const validarTarifasSinDuplicados = (tarifas) => {
  if (tieneTipoVehiculoDuplicado(tarifas)) {
    throw new SolicitudInvalida([
      { campo: 'tarifas', mensaje: 'No puede haber dos tarifas para el mismo tipo de vehículo' },
    ]);
  }
};

/**
 * Traduce un error de Postgres (vía supabase-js) a una de las clases de
 * utils/errores.js. Los códigos son los que las migraciones de
 * `servicios`/`tarifas_servicio` pueden disparar.
 */
const traducirErrorPostgres = (error) => {
  // 23505 unique_violation: dos posibles índices únicos.
  if (error.code === '23505') {
    if (error.message.includes('tarifas_servicio_servicio_tipo_key')) {
      return new SolicitudInvalida([
        { campo: 'tarifas', mensaje: 'No puede haber dos tarifas para el mismo tipo de vehículo' },
      ]);
    }
    // servicios_numero_key
    return new Conflicto('Ya existe un servicio con ese número');
  }

  // 23503 foreign_key_violation al borrar: ordenes_lavado.servicio_id (restrict).
  if (error.code === '23503') {
    return new Conflicto('No se puede eliminar un servicio con órdenes de lavado asociadas');
  }

  // 23514 check_violation: formato o regla de negocio de servicios/tarifas_servicio.
  if (error.code === '23514') {
    return new SolicitudInvalida([], 'Datos de servicio inválidos');
  }

  return new Error(`Error de base de datos en servicios: ${error.message}`);
};

/**
 * Lista todos los servicios.
 * @returns {Promise<object[]>}
 */
const listarServicios = async () => {
  const { data, error } = await supabase
    .from('servicios')
    .select(COLUMNAS)
    .order('id', { foreignTable: 'tarifas_servicio', ascending: true });

  if (error) {
    throw new Error(`No se pudo listar servicios: ${error.message}`);
  }

  return aCamelCase(data);
};

/**
 * Obtiene un servicio por id.
 * @param {number|string} id
 * @returns {Promise<object | null>}
 */
const obtenerServicioPorId = async (id) => {
  const { data, error } = await supabase
    .from('servicios')
    .select(COLUMNAS)
    .eq('id', id)
    .order('id', { foreignTable: 'tarifas_servicio', ascending: true })
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener el servicio: ${error.message}`);
  }

  return data ? aCamelCase(data) : null;
};

/**
 * Obtiene un servicio por id, o lanza NoEncontrado (404). Otros recursos
 * (Órdenes de lavado) usan esta función para validar servicioId antes de
 * crear su propio registro.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NoEncontrado}
 */
const obtenerServicioOFallar = async (id) => {
  const servicio = await obtenerServicioPorId(id);
  if (!servicio) {
    throw new NoEncontrado('Servicio no encontrado');
  }
  return servicio;
};

/**
 * R3: el servicio debe tener tarifa definida para el tipo de vehículo
 * (un servicio de motos no aplica a una camioneta). Órdenes de lavado la
 * usa para resolver el valor a cobrar. Pura: opera sobre un servicio ya
 * cargado (con sus tarifas ya embebidas), no vuelve a consultar la BD.
 *
 * @param {object} servicio
 * @param {string} tipoVehiculo
 * @returns {number} el valor de la tarifa
 * @throws {Conflicto} si el servicio no tiene tarifa para ese tipo de vehículo
 */
const obtenerTarifaParaTipoVehiculo = (servicio, tipoVehiculo) => {
  const tarifa = servicio.tarifas.find((entrada) => entrada.tipoVehiculo === tipoVehiculo);
  if (!tarifa) {
    throw new Conflicto('El servicio no tiene tarifa definida para ese tipo de vehículo');
  }
  return tarifa.valor;
};

/**
 * R7: los servicios cuyo número está en SERVICIOS_CON_LAVADO_MOTOR
 * incluyen lavado de motor y requieren autorización explícita. Recibe
 * el número de catálogo (no el id interno), porque así está definida
 * la regla en el dominio compartido.
 *
 * @param {number|string} numero
 * @returns {boolean}
 */
const requiereAutorizacionMotor = (numero) => SERVICIOS_CON_LAVADO_MOTOR.includes(Number(numero));

/**
 * Crea un servicio nuevo, con sus tarifas.
 *
 * Reglas de negocio:
 * - El número es único (409 si ya existe) — lo rechaza el UNIQUE de la
 *   BD, traducido por traducirErrorPostgres.
 * - Las tarifas no pueden repetir tipoVehiculo (400 si ocurre).
 * - Todo servicio nuevo nace activo (default de la columna).
 *
 * El servicio y sus tarifas son dos tablas (sin transacción real vía
 * supabase-js): si la inserción de tarifas falla, se borra el servicio
 * recién creado para no dejar un registro huérfano sin tarifas.
 *
 * @param {{ numero: number, nombre: string, descripcion: string, categoria: string, tarifas: Array<{ tipoVehiculo: string, valor: number }> }} datos
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} el servicio creado
 */
const crearServicio = async (datos, usuarioId) => {
  validarTarifasSinDuplicados(datos.tarifas);

  const cliente = crearClienteConUsuario(usuarioId);

  const { data: servicioCreado, error: errorServicio } = await cliente
    .from('servicios')
    .insert({
      numero: datos.numero,
      nombre: datos.nombre,
      descripcion: datos.descripcion,
      categoria: datos.categoria,
    })
    .select('id')
    .single();

  if (errorServicio) {
    throw traducirErrorPostgres(errorServicio);
  }

  const filasTarifas = datos.tarifas.map((tarifa) => ({
    servicio_id: servicioCreado.id,
    tipo_vehiculo: tarifa.tipoVehiculo,
    valor: tarifa.valor,
  }));

  const { error: errorTarifas } = await cliente.from('tarifas_servicio').insert(filasTarifas);

  if (errorTarifas) {
    await cliente.from('servicios').delete().eq('id', servicioCreado.id);
    throw traducirErrorPostgres(errorTarifas);
  }

  return obtenerServicioOFallar(servicioCreado.id);
};

/**
 * Actualiza un servicio existente. Si se envía tarifas, reemplaza el
 * conjunto completo (borra las anteriores y crea las nuevas; no se
 * fusiona con el anterior).
 *
 * @param {number|string} id
 * @param {{ numero?: number, nombre?: string, descripcion?: string, categoria?: string, tarifas?: Array<{ tipoVehiculo: string, valor: number }>, activo?: boolean }} datos
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} el servicio actualizado
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si el número nuevo ya pertenece a otro servicio
 * @throws {SolicitudInvalida} si las tarifas nuevas repiten tipoVehiculo
 */
const actualizarServicio = async (id, datos, usuarioId) => {
  const servicioActual = await obtenerServicioOFallar(id);

  if (datos.tarifas !== undefined) {
    validarTarifasSinDuplicados(datos.tarifas);
  }

  const cliente = crearClienteConUsuario(usuarioId);

  const { error: errorServicio } = await cliente
    .from('servicios')
    .update({
      numero: datos.numero ?? servicioActual.numero,
      nombre: datos.nombre ?? servicioActual.nombre,
      descripcion: datos.descripcion ?? servicioActual.descripcion,
      categoria: datos.categoria ?? servicioActual.categoria,
      activo: datos.activo ?? servicioActual.activo,
    })
    .eq('id', id);

  if (errorServicio) {
    throw traducirErrorPostgres(errorServicio);
  }

  if (datos.tarifas !== undefined) {
    const { error: errorBorrarTarifas } = await cliente
      .from('tarifas_servicio')
      .delete()
      .eq('servicio_id', id);

    if (errorBorrarTarifas) {
      throw traducirErrorPostgres(errorBorrarTarifas);
    }

    const filasTarifas = datos.tarifas.map((tarifa) => ({
      servicio_id: id,
      tipo_vehiculo: tarifa.tipoVehiculo,
      valor: tarifa.valor,
    }));

    const { error: errorTarifas } = await cliente.from('tarifas_servicio').insert(filasTarifas);

    if (errorTarifas) {
      throw traducirErrorPostgres(errorTarifas);
    }
  }

  return obtenerServicioOFallar(id);
};

/**
 * Elimina un servicio por id. Sus tarifas se borran en cascada (FK
 * tarifas_servicio_servicio_id_fkey on delete cascade).
 *
 * La verificación de "no tiene órdenes" (409) vive primero en el
 * controller, llamando a ordenesLavadoService.servicioTieneOrdenes(id).
 * La FK ordenes_lavado.servicio_id (restrict) es la defensa adicional si
 * esa verificación quedó desactualizada.
 *
 * @param {number|string} id
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @throws {NoEncontrado} si el id no existe
 */
const eliminarServicio = async (id, usuarioId) => {
  await obtenerServicioOFallar(id);

  const { error } = await crearClienteConUsuario(usuarioId).from('servicios').delete().eq('id', id);

  if (error) {
    throw traducirErrorPostgres(error);
  }
};

module.exports = {
  listarServicios,
  obtenerServicioPorId,
  obtenerServicioOFallar,
  obtenerTarifaParaTipoVehiculo,
  requiereAutorizacionMotor,
  crearServicio,
  actualizarServicio,
  eliminarServicio,
};
