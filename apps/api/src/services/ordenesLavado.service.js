const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const clientesService = require('./clientes.service');
const vehiculosService = require('./vehiculos.service');
const colaboradoresService = require('./colaboradores.service');
const serviciosService = require('./servicios.service');
const jornadasService = require('./jornadas.service');
const {
  ESTADOS_ORDEN,
  ESTADOS_ORDEN_CERRADOS,
  TRANSICIONES_ORDEN,
  ESTADOS_ACTIVIDAD,
  TIPOS_CLIENTE,
  MEDIOS_PAGO,
} = require('../constants/dominio');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');
const { crearTraductorErroresPostgres } = require('../utils/traducirErrorPostgres');

// Nunca *: porcentaje_comision nunca se selecciona mientras el contrato
// HTTP no la incluya (igual que creado_en/actualizado_en); tampoco se
// envía NUNCA en insert/update, ni al crear ni al editar: los triggers
// preparar_orden_lavado()/proteger_orden_lavado() la fijan siempre desde
// el colaborador vigente (ver supabase/README.md, contrato de integración).
// El alias creada_en:creado_en es el mismo patrón de jornadas/servicios.
const COLUMNAS =
  'id, jornada_id, fecha, turno, vehiculo_id, servicio_id, colaborador_id, cliente_id, valor, medio_pago, autoriza_motor, observaciones, motivo, estado, creada_en:creado_en';

/**
 * Traduce un error de Postgres (vía supabase-js) a una de las clases de
 * utils/errores.js. Los códigos son los que la tabla y las reglas
 * (triggers) de `ordenes_lavado` pueden disparar.
 *
 * 23514 (check_violation) incluye las que protege proteger_orden_lavado()
 * (campos congelados, orden cerrada): tampoco debería dispararse en la
 * práctica, el service ya valida esas reglas antes; queda como defensa
 * adicional, con el mensaje genérico por defecto del helper.
 */
const traducirErrorPostgres = crearTraductorErroresPostgres({
  tabla: 'ordenes_lavado',
  etiqueta: 'orden de lavado',
  mapeo: {
    // 23505 unique_violation: dos posibles índices únicos.
    23505: (error) =>
      error.message.includes('idx_ordenes_lavado_vehiculo_abierta')
        ? new Conflicto('El vehículo ya tiene una orden abierta') // R6
        : // ordenes_lavado_fecha_turno_key
          new Conflicto('El turno ya está ocupado para esa fecha'), // R5
    // 23503 foreign_key_violation al insertar/actualizar: el vehículo,
    // servicio, colaborador, jornada o cliente referenciado no existe. En
    // la práctica no debería dispararse (R1 ya los valida con
    // obtener...OFallar antes de llegar aquí); queda como defensa adicional.
    23503: () => new NoEncontrado('El recurso referenciado no existe'),
  },
});

/**
 * Lista las órdenes de lavado. Cada filtro es opcional y se aplica solo
 * si viene definido; los que vengan se combinan con AND.
 * @param {{ fecha?: string, colaboradorId?: number, servicioId?: number, medioPago?: string, jornadaId?: number }} [filtros]
 * @returns {Promise<object[]>}
 */
const listarOrdenes = async (filtros = {}) => {
  let consulta = supabase.from('ordenes_lavado').select(COLUMNAS);

  if (filtros.fecha !== undefined) {
    consulta = consulta.eq('fecha', filtros.fecha);
  }
  if (filtros.colaboradorId !== undefined) {
    consulta = consulta.eq('colaborador_id', filtros.colaboradorId);
  }
  if (filtros.servicioId !== undefined) {
    consulta = consulta.eq('servicio_id', filtros.servicioId);
  }
  if (filtros.medioPago !== undefined) {
    consulta = consulta.eq('medio_pago', filtros.medioPago);
  }
  if (filtros.jornadaId !== undefined) {
    consulta = consulta.eq('jornada_id', filtros.jornadaId);
  }

  const { data, error } = await consulta;

  if (error) {
    throw new Error(`No se pudo listar ordenes_lavado: ${error.message}`);
  }

  return aCamelCase(data);
};

/**
 * Totales de un conjunto de órdenes YA FILTRADO (no vuelve a consultar la
 * BD). Las órdenes canceladas nunca suman: ni a cantidadServicios, ni a
 * totalGeneral, ni a su medioPago — aunque sigan apareciendo en el
 * listado. Recorre el arreglo una sola vez. Pura: no hace I/O.
 *
 * @param {object[]} ordenes
 * @returns {{ cantidadServicios: number, totalGeneral: number, totalesPorMedioPago: Record<string, number> }}
 */
const calcularTotales = (ordenes) => {
  const totalesPorMedioPago = Object.fromEntries(
    Object.values(MEDIOS_PAGO).map((medioPago) => [medioPago, 0]),
  );

  let cantidadServicios = 0;
  let totalGeneral = 0;

  ordenes.forEach((orden) => {
    if (orden.estado === ESTADOS_ORDEN.CANCELADA) {
      return;
    }
    cantidadServicios += 1;
    totalGeneral += orden.valor;
    totalesPorMedioPago[orden.medioPago] += orden.valor;
  });

  return { cantidadServicios, totalGeneral, totalesPorMedioPago };
};

/**
 * Agregados de una jornada sobre sus propias órdenes (SCRUM-38): unidades
 * es siempre derivado, igual al número de servicios no anulados.
 * Reutiliza listarOrdenes/calcularTotales en vez de reimplementar el
 * filtro o la suma.
 *
 * async porque listarOrdenes ya consulta Supabase (SCRUM-152).
 *
 * @param {number|string} jornadaId
 * @returns {Promise<{ unidades: number, ventaTotal: number }>}
 */
const obtenerTotalesDeJornada = async (jornadaId) => {
  const ordenesDeLaJornada = await listarOrdenes({ jornadaId });
  const { cantidadServicios, totalGeneral } = calcularTotales(ordenesDeLaJornada);
  return { unidades: cantidadServicios, ventaTotal: totalGeneral };
};

/**
 * Igual que obtenerTotalesDeJornada, pero para VARIAS jornadas a la vez,
 * en una sola consulta: GET /api/jornadas la usa para no hacer una
 * consulta aparte por cada jornada de la lista (N+1). Con las jornadas
 * ya reales y permanentes en Supabase (SCRUM-152, nunca se borran), una
 * consulta por jornada sí importa — con un array en memoria no importaba.
 *
 * @param {Array<number>} jornadaIds
 * @returns {Promise<Map<number, { unidades: number, ventaTotal: number }>>} una entrada por cada id, en 0 si la jornada no tiene órdenes
 */
const obtenerTotalesPorJornada = async (jornadaIds) => {
  const totalesPorJornada = new Map(jornadaIds.map((id) => [id, { unidades: 0, ventaTotal: 0 }]));

  if (jornadaIds.length === 0) {
    return totalesPorJornada;
  }

  const { data, error } = await supabase
    .from('ordenes_lavado')
    .select('jornada_id, valor, estado')
    .in('jornada_id', jornadaIds);

  if (error) {
    throw new Error(`No se pudo listar ordenes_lavado: ${error.message}`);
  }

  data.forEach((fila) => {
    if (fila.estado === ESTADOS_ORDEN.CANCELADA) {
      return;
    }
    const totales = totalesPorJornada.get(fila.jornada_id);
    totales.unidades += 1;
    totales.ventaTotal += fila.valor;
  });

  return totalesPorJornada;
};

/**
 * Obtiene una orden por id.
 * @param {number|string} id
 * @returns {Promise<object | null>}
 */
const obtenerOrdenPorId = async (id) => {
  const { data, error } = await supabase
    .from('ordenes_lavado')
    .select(COLUMNAS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener la orden de lavado: ${error.message}`);
  }

  return data ? aCamelCase(data) : null;
};

/**
 * Obtiene una orden por id, o lanza NoEncontrado (404).
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NoEncontrado}
 */
const obtenerOrdenOFallar = async (id) => {
  const orden = await obtenerOrdenPorId(id);
  if (!orden) {
    throw new NoEncontrado('Orden de lavado no encontrada');
  }
  return orden;
};

/**
 * Integridad referencial (patrón <entidad>Tiene<Relacion>() del estándar):
 * cancelar una orden no es lo mismo que eliminarla, así que cuenta
 * CUALQUIER orden sin importar su estado, incluidas entregada y cancelada.
 * count-based (sin traer filas), igual que vehiculosService.clienteTieneVehiculos.
 *
 * @param {number|string} colaboradorId
 * @returns {Promise<boolean>}
 */
const colaboradorTieneOrdenes = async (colaboradorId) => {
  const { count, error } = await supabase
    .from('ordenes_lavado')
    .select('id', { count: 'exact', head: true })
    .eq('colaborador_id', colaboradorId);

  if (error) {
    throw new Error(`No se pudo verificar las órdenes del colaborador: ${error.message}`);
  }

  return count > 0;
};

/**
 * Igual que colaboradorTieneOrdenes, para servicioId.
 * @param {number|string} servicioId
 * @returns {Promise<boolean>}
 */
const servicioTieneOrdenes = async (servicioId) => {
  const { count, error } = await supabase
    .from('ordenes_lavado')
    .select('id', { count: 'exact', head: true })
    .eq('servicio_id', servicioId);

  if (error) {
    throw new Error(`No se pudo verificar las órdenes del servicio: ${error.message}`);
  }

  return count > 0;
};

/**
 * Igual que colaboradorTieneOrdenes, para vehiculoId.
 * @param {number|string} vehiculoId
 * @returns {Promise<boolean>}
 */
const vehiculoTieneOrdenes = async (vehiculoId) => {
  const { count, error } = await supabase
    .from('ordenes_lavado')
    .select('id', { count: 'exact', head: true })
    .eq('vehiculo_id', vehiculoId);

  if (error) {
    throw new Error(`No se pudo verificar las órdenes del vehículo: ${error.message}`);
  }

  return count > 0;
};

/**
 * R2: el colaborador asignado debe estar activo. La usan crearOrden y
 * editarOrden cuando el colaborador cambia.
 * @param {object} colaborador
 * @throws {Conflicto}
 */
const validarColaboradorActivo = (colaborador) => {
  if (colaborador.estado !== ESTADOS_ACTIVIDAD.ACTIVO) {
    throw new Conflicto('No se puede asignar una orden a un colaborador inactivo');
  }
};

/**
 * R3: el servicio debe estar activo y tener tarifa para el tipo de
 * vehículo (obtenerTarifaParaTipoVehiculo ya lanza Conflicto si falta).
 * La usan crearOrden y editarOrden: esta última SIEMPRE la vuelve a
 * llamar, porque el valor depende del tipo de vehículo final. Pura: opera
 * sobre un servicio ya cargado, no hace I/O.
 *
 * @param {object} servicio
 * @param {string} tipoVehiculo
 * @returns {number} el valor de la tarifa
 * @throws {Conflicto}
 */
const calcularValorServicio = (servicio, tipoVehiculo) => {
  if (servicio.activo !== true) {
    throw new Conflicto('El servicio no está activo');
  }
  return serviciosService.obtenerTarifaParaTipoVehiculo(servicio, tipoVehiculo);
};

/**
 * R7: los servicios con lavado de motor exigen autorización explícita.
 * @param {object} servicio
 * @param {boolean|undefined} autorizaMotor
 * @throws {Conflicto}
 */
const validarAutorizacionMotor = (servicio, autorizaMotor) => {
  if (serviciosService.requiereAutorizacionMotor(servicio.numero) && autorizaMotor !== true) {
    throw new Conflicto('Este servicio exige autorización explícita para lavado de motor');
  }
};

/**
 * R8: clienteId solo se procesa (y se exige) cuando el pago es a
 * crédito. La usan crearOrden y editarOrden cuando medioPago o
 * clienteId cambian.
 *
 * @param {string} medioPago
 * @param {number|string|undefined} clienteId
 * @returns {Promise<number|null>} el clienteId final de la orden
 * @throws {Conflicto} si falta clienteId, o el cliente no tiene crédito habilitado
 * @throws {NoEncontrado} si el clienteId no existe
 */
const resolverClienteCredito = async (medioPago, clienteId) => {
  if (medioPago !== MEDIOS_PAGO.CREDITO) {
    return null;
  }

  if (!clienteId) {
    throw new Conflicto('El pago a crédito requiere un clienteId');
  }

  const cliente = await clientesService.obtenerClienteOFallar(clienteId);
  if (
    cliente.estado !== ESTADOS_ACTIVIDAD.ACTIVO ||
    cliente.tipo !== TIPOS_CLIENTE.EMPRESA ||
    cliente.creditoHabilitado !== true
  ) {
    throw new Conflicto('El cliente no tiene crédito habilitado');
  }

  return Number(clienteId);
};

/**
 * R3 (aplicabilidad, al editar): el servicio de la orden debe tener
 * tarifa para el tipo de vehículo nuevo. Reutiliza
 * serviciosService.obtenerTarifaParaTipoVehiculo —la misma función que
 * consulta calcularValorServicio— pero descarta el valor devuelto: es
 * una verificación de aplicabilidad servicio↔tipo, no de precio. No
 * revisa servicio.activo; esa parte de R3 solo se revalida al crear.
 *
 * @param {number|string} servicioId
 * @param {string} tipoVehiculo
 * @throws {Conflicto} si el servicio no tiene tarifa para ese tipo de vehículo
 */
const validarServicioAplicaATipo = async (servicioId, tipoVehiculo) => {
  const servicio = await serviciosService.obtenerServicioOFallar(servicioId);
  serviciosService.obtenerTarifaParaTipoVehiculo(servicio, tipoVehiculo);
};

/**
 * Crea una orden de lavado nueva, aplicando en orden las reglas R1 a R8
 * del estándar del proyecto. Si alguna falla, lanza su error y no evalúa
 * las siguientes. La orden queda amarrada a la jornada abierta en ese
 * momento; su fecha es siempre la de esa jornada.
 *
 * R5 (turno único por fecha) y R6 (vehículo sin otra orden abierta) ya no
 * se revalidan aquí: las protegen directamente ordenes_lavado_fecha_turno_key
 * e idx_ordenes_lavado_vehiculo_abierta, traducidas por traducirErrorPostgres
 * — mismo patrón que el resto de unicidades de este proyecto (clientes,
 * vehiculos, servicios, jornadas).
 *
 * @param {{ turno: number, vehiculoId: number, servicioId: number, colaboradorId: number, medioPago: string, clienteId?: number, autorizaMotor?: boolean, observaciones?: string }} datos
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} la orden creada
 * @throws {Conflicto} si no hay ninguna jornada abierta
 */
const crearOrden = async (datos, usuarioId) => {
  const jornada = await jornadasService.obtenerJornadaAbierta();
  if (!jornada) {
    throw new Conflicto('No hay una jornada abierta para registrar órdenes');
  }

  // R1: vehículo, servicio y colaborador deben existir (404 si no).
  const vehiculo = await vehiculosService.obtenerVehiculoOFallar(datos.vehiculoId);
  const servicio = await serviciosService.obtenerServicioOFallar(datos.servicioId);
  const colaborador = await colaboradoresService.obtenerColaboradorOFallar(datos.colaboradorId);

  validarColaboradorActivo(colaborador); // R2
  const valor = calcularValorServicio(servicio, vehiculo.tipoVehiculo); // R3
  validarAutorizacionMotor(servicio, datos.autorizaMotor); // R7
  const clienteId = await resolverClienteCredito(datos.medioPago, datos.clienteId); // R8

  // R4 + allowlisting: el valor es siempre el calculado en R3, nunca el
  // que venga en datos. porcentaje_comision NUNCA se envía: el trigger
  // preparar_orden_lavado() la congela desde el colaborador vigente.
  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('ordenes_lavado')
    .insert({
      jornada_id: jornada.id,
      fecha: jornada.fecha,
      turno: datos.turno,
      vehiculo_id: Number(datos.vehiculoId),
      servicio_id: Number(datos.servicioId),
      colaborador_id: Number(datos.colaboradorId),
      valor,
      medio_pago: datos.medioPago,
      cliente_id: clienteId,
      autoriza_motor: Boolean(datos.autorizaMotor ?? false),
      observaciones: datos.observaciones ?? null,
    })
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
};

/**
 * Edita campos no financieros de una orden abierta: vehiculoId,
 * colaboradorId, medioPago, clienteId, observaciones. NUNCA valor,
 * servicioId, estado, fecha, jornadaId ni porcentajeComision — ni
 * siquiera se declaran en el payload: el trigger proteger_orden_lavado()
 * rechaza cualquier cambio en valor/servicioId/jornadaId/fecha/turno/
 * creadaEn, y recalcula porcentajeComision por su cuenta solo si
 * colaboradorId cambia.
 *
 * `valor` es inmutable desde la creación: se fija una sola vez en
 * crearOrden y esta función nunca lo recalcula ni lo toca, sin importar
 * si la tarifa del servicio cambió o el vehículo editado tiene un tipo
 * distinto. Editar es para corregir datos operativos, nunca el monto
 * cobrado. Como consecuencia, el 409 "El servicio no está activo" ya no
 * puede dispararse desde aquí (solo desde crearOrden, que es quien sí
 * calcula el valor).
 *
 * Reutiliza las mismas reglas R2/R3 (aplicabilidad)/R8 que crearOrden,
 * mediante las funciones privadas de este archivo, para no duplicar su
 * lógica. Si el vehículo cambia, revalida que el servicio original
 * tenga tarifa para el tipo de vehículo nuevo (R3), sin importar si el
 * tipo coincide con el anterior o no. R6 (vehículo sin otra orden
 * abierta) la revalida directamente idx_ordenes_lavado_vehiculo_abierta
 * al actualizar, sin necesitar excluir la propia orden: el índice
 * compara contra las DEMÁS filas de la tabla, nunca contra la fila que
 * se está actualizando.
 *
 * @param {number|string} id
 * @param {{ vehiculoId?: number, colaboradorId?: number, medioPago?: string, clienteId?: number, observaciones?: string }} datos
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} la orden editada
 * @throws {NoEncontrado} si el id no existe, o el nuevo vehiculoId/colaboradorId no existen
 * @throws {Conflicto} si la orden está cerrada, su jornada ya no está abierta, o viola R2/R3/R6/R8
 */
const editarOrden = async (id, datos, usuarioId) => {
  const orden = await obtenerOrdenOFallar(id);

  if (ESTADOS_ORDEN_CERRADOS.includes(orden.estado)) {
    throw new Conflicto('No se puede editar una orden entregada o cancelada');
  }

  if (!(await jornadasService.jornadaEstaAbierta(orden.jornadaId))) {
    throw new Conflicto('No se puede editar una orden de una jornada que ya no está abierta');
  }

  const vehiculoIdFinal =
    datos.vehiculoId !== undefined ? Number(datos.vehiculoId) : orden.vehiculoId;
  const colaboradorIdFinal =
    datos.colaboradorId !== undefined ? Number(datos.colaboradorId) : orden.colaboradorId;
  const medioPagoFinal = datos.medioPago ?? orden.medioPago;
  const clienteIdFinal = datos.clienteId !== undefined ? datos.clienteId : orden.clienteId;

  if (vehiculoIdFinal !== orden.vehiculoId) {
    const vehiculo = await vehiculosService.obtenerVehiculoOFallar(vehiculoIdFinal); // R1
    await validarServicioAplicaATipo(orden.servicioId, vehiculo.tipoVehiculo); // R3 (aplicabilidad)
  }

  if (colaboradorIdFinal !== orden.colaboradorId) {
    const colaborador = await colaboradoresService.obtenerColaboradorOFallar(colaboradorIdFinal); // R1
    validarColaboradorActivo(colaborador); // R2
  }

  let clienteIdResuelto = orden.clienteId;
  if (medioPagoFinal !== orden.medioPago || clienteIdFinal !== orden.clienteId) {
    clienteIdResuelto = await resolverClienteCredito(medioPagoFinal, clienteIdFinal); // R8
  }

  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('ordenes_lavado')
    .update({
      vehiculo_id: vehiculoIdFinal,
      colaborador_id: colaboradorIdFinal,
      medio_pago: medioPagoFinal,
      cliente_id: clienteIdResuelto,
      observaciones: datos.observaciones !== undefined ? datos.observaciones : orden.observaciones,
    })
    .eq('id', id)
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
};

/**
 * Cambia el estado de una orden siguiendo la máquina de estados del
 * dominio compartido.
 *
 * R10: una orden cerrada (entregada o cancelada) no puede cambiar de
 * estado nunca más — lo revalida también proteger_orden_lavado() como
 * defensa adicional. R9: cualquier otra transición debe estar listada en
 * TRANSICIONES_ORDEN[estado actual]. Cancelar exige motivo; para
 * cualquier otro estado, motivo se ignora.
 *
 * @param {number|string} id
 * @param {string} nuevoEstado
 * @param {string} [motivo] obligatorio solo si nuevoEstado es "cancelada"
 * @param {number} usuarioId quién hace el cambio (lo lee registrar_auditoria())
 * @returns {Promise<object>} la orden actualizada
 * @throws {NoEncontrado} si el id no existe
 * @throws {Conflicto} si la orden ya está cerrada o la transición no es válida
 * @throws {SolicitudInvalida} si se cancela sin motivo
 */
const cambiarEstadoOrden = async (id, nuevoEstado, motivo, usuarioId) => {
  const orden = await obtenerOrdenOFallar(id);

  if (ESTADOS_ORDEN_CERRADOS.includes(orden.estado)) {
    throw new Conflicto('Una orden entregada o cancelada no puede cambiar de estado');
  }

  const transicionesPermitidas = TRANSICIONES_ORDEN[orden.estado];
  if (!transicionesPermitidas.includes(nuevoEstado)) {
    throw new Conflicto(`Transición de estado no permitida: de ${orden.estado} a ${nuevoEstado}`);
  }

  const cambios = { estado: nuevoEstado };
  if (nuevoEstado === ESTADOS_ORDEN.CANCELADA) {
    if (!motivo) {
      throw new SolicitudInvalida([
        { campo: 'motivo', mensaje: 'El motivo es obligatorio para cancelar una orden' },
      ]);
    }
    cambios.motivo = motivo;
  }

  const { data, error } = await crearClienteConUsuario(usuarioId)
    .from('ordenes_lavado')
    .update(cambios)
    .eq('id', id)
    .select(COLUMNAS)
    .single();

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return aCamelCase(data);
};

module.exports = {
  listarOrdenes,
  obtenerOrdenPorId,
  obtenerOrdenOFallar,
  colaboradorTieneOrdenes,
  servicioTieneOrdenes,
  vehiculoTieneOrdenes,
  crearOrden,
  editarOrden,
  cambiarEstadoOrden,
  calcularTotales,
  obtenerTotalesDeJornada,
  obtenerTotalesPorJornada,
};
