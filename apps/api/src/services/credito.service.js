const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const clientesService = require('./clientes.service');
const { ESTADOS_ORDEN, MEDIOS_PAGO } = require('../constants/dominio');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');
const { crearTraductorErroresPostgres } = require('../utils/traducirErrorPostgres');

// Nunca *: así nunca se filtran creado_en ni columnas internas mientras el
// contrato HTTP no las incluya (ver supabase/README.md, "Contrato de
// integración con la API"). El alias "ordenes" es el mismo patrón de
// tarifas/reaperturas (select anidado sobre la relación inversa de una FK):
// ordenes_lavado.pago_credito_id -> pagos_credito.id.
const COLUMNAS_PAGO =
  'id, cliente_id, valor_total, registrado_por, pagado_en, ' +
  'ordenes:ordenes_lavado(id, fecha, turno, valor, servicio_id, vehiculo_id, colaborador_id)';

const COLUMNAS_ORDEN_PENDIENTE =
  'id, fecha, turno, valor, servicio_id, vehiculo_id, colaborador_id';

/**
 * Traduce un error de Postgres (vía supabase-js) a una de las clases de
 * utils/errores.js. Los códigos son los que registrar_pago_credito()
 * puede disparar (ver su migración, agregar_pagos_credito.sql): a
 * diferencia de otros services, aquí se reenvía el mensaje propio de la
 * función (ya en español y específico de cada regla) en vez de uno
 * genérico, porque la función los redactó pensando en eso (ver ADR 0005).
 *
 * 23514 (check_violation) agrupa dos tipos de fallo bajo el mismo código:
 * de formato (arreglo vacío o con ids repetidos, 400) y de regla de
 * negocio (orden de otro cliente, no es a crédito, no está entregada,
 * 409) — se distinguen por el texto del mensaje, igual que otros services
 * ya distinguen significados distintos de un mismo SQLSTATE por el índice
 * o restricción involucrada.
 */
const traducirErrorPostgres = crearTraductorErroresPostgres({
  tabla: 'pagos_credito',
  etiqueta: 'pago de crédito',
  mapeo: {
    23514: (error) =>
      /al menos una orden|ids repetidos/.test(error.message)
        ? new SolicitudInvalida([{ campo: 'ordenIds', mensaje: error.message }])
        : new Conflicto(error.message),
    // 23503 foreign_key_violation: alguna de las órdenes indicadas no existe.
    23503: (error) => new NoEncontrado(error.message),
    // 23505 unique_violation: alguna de las órdenes ya tiene un pago registrado.
    23505: (error) => new Conflicto(error.message),
  },
});

/**
 * Lista los clientes con crédito habilitado y su saldo pendiente.
 *
 * Saldo pendiente = suma de valor de sus órdenes con medio_pago='credito',
 * estado<>'cancelada' y sin pago asociado (pago_credito_id is null) — la
 * misma definición documentada en agregar_pagos_credito.sql. Incluye
 * TODAS las órdenes no pagadas sin importar su estado operativo
 * (registrada/en_proceso/terminada/entregada): la deuda existe desde que
 * se registra la orden, aunque solo las 'entregada' sean pagables ahora
 * (ver listarOrdenesPendientesDeCliente).
 *
 * @returns {Promise<Array<object>>} cada cliente con su saldoPendiente (0 si no debe nada)
 */
const listarClientesConCredito = async () => {
  const { data: clientes, error: errorClientes } = await supabase
    .from('clientes')
    .select('id, nombre, documento, telefono, email, estado')
    .eq('credito_habilitado', true);

  if (errorClientes) {
    throw new Error(`No se pudo listar los clientes con crédito: ${errorClientes.message}`);
  }

  if (clientes.length === 0) {
    return [];
  }

  const idsClientes = clientes.map((cliente) => cliente.id);
  const saldosPorCliente = new Map(idsClientes.map((id) => [id, 0]));

  const { data: ordenes, error: errorOrdenes } = await supabase
    .from('ordenes_lavado')
    .select('cliente_id, valor')
    .in('cliente_id', idsClientes)
    .eq('medio_pago', MEDIOS_PAGO.CREDITO)
    .is('pago_credito_id', null)
    .neq('estado', ESTADOS_ORDEN.CANCELADA);

  if (errorOrdenes) {
    throw new Error(`No se pudo calcular el saldo pendiente: ${errorOrdenes.message}`);
  }

  ordenes.forEach((orden) => {
    saldosPorCliente.set(orden.cliente_id, saldosPorCliente.get(orden.cliente_id) + orden.valor);
  });

  return aCamelCase(clientes).map((cliente) => ({
    ...cliente,
    saldoPendiente: saldosPorCliente.get(cliente.id),
  }));
};

/**
 * Lista las órdenes de un cliente que se pueden pagar AHORA MISMO: a
 * crédito, 'entregada' y sin pago previo (R11, ver ADR 0005: "solo se
 * paga una orden entregada"). Es el conjunto exacto de ordenIds válidos
 * para registrarPagoCredito — a diferencia del saldo pendiente (que
 * incluye órdenes aún no entregadas), esta lista solo trae lo pagable.
 *
 * @param {number|string} clienteId
 * @returns {Promise<Array<object>>}
 * @throws {NoEncontrado} si el cliente no existe
 */
const listarOrdenesPendientesDeCliente = async (clienteId) => {
  await clientesService.obtenerClienteOFallar(clienteId);

  const { data, error } = await supabase
    .from('ordenes_lavado')
    .select(COLUMNAS_ORDEN_PENDIENTE)
    .eq('cliente_id', clienteId)
    .eq('medio_pago', MEDIOS_PAGO.CREDITO)
    .eq('estado', ESTADOS_ORDEN.ENTREGADA)
    .is('pago_credito_id', null)
    .order('fecha', { ascending: true });

  if (error) {
    throw new Error(`No se pudo listar las órdenes pendientes de pago: ${error.message}`);
  }

  return aCamelCase(data);
};

/**
 * Obtiene un pago de crédito por id, con las órdenes que incluyó.
 * @param {number|string} id
 * @returns {Promise<object | null>}
 */
const obtenerPagoPorId = async (id) => {
  const { data, error } = await supabase
    .from('pagos_credito')
    .select(COLUMNAS_PAGO)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener el pago de crédito: ${error.message}`);
  }

  return data ? aCamelCase(data) : null;
};

/**
 * Obtiene un pago de crédito por id, o lanza NoEncontrado (404).
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NoEncontrado}
 */
const obtenerPagoOFallar = async (id) => {
  const pago = await obtenerPagoPorId(id);
  if (!pago) {
    throw new NoEncontrado('Pago de crédito no encontrado');
  }
  return pago;
};

/**
 * Lista el historial de pagos de crédito, opcionalmente filtrado por cliente.
 * @param {{ clienteId?: number }} [filtros]
 * @returns {Promise<Array<object>>}
 */
const listarPagos = async (filtros = {}) => {
  let consulta = supabase.from('pagos_credito').select(COLUMNAS_PAGO);

  if (filtros.clienteId !== undefined) {
    consulta = consulta.eq('cliente_id', filtros.clienteId);
  }

  const { data, error } = await consulta.order('pagado_en', { ascending: false });

  if (error) {
    throw new Error(`No se pudo listar los pagos de crédito: ${error.message}`);
  }

  return aCamelCase(data);
};

/**
 * Registra el pago completo de un conjunto de órdenes a crédito del mismo
 * cliente, vía la función RPC registrar_pago_credito (todo o nada, ver su
 * migración): bloquea las órdenes indicadas y valida que el arreglo no
 * esté vacío ni repita ids, que todas existan, sean del cliente, a
 * crédito, estén entregadas y sin pago previo. Si cualquier validación
 * falla, no se paga nada. El valor total (suma de valor) lo calcula la
 * propia función, no este service.
 *
 * clienteId se valida primero contra clientes (404 claro si no existe):
 * la función RPC en sí no lo valida por separado, solo que las órdenes
 * indicadas pertenezcan a ese cliente — sin este chequeo, un clienteId
 * inexistente terminaría en el 409 de "las órdenes deben pertenecer al
 * cliente indicado", un mensaje menos claro que el 404 real.
 *
 * No se exige credito_habilitado=true en el cliente al pagar (decisión):
 * una orden con medio_pago='credito' solo pudo crearse cuando el cliente
 * SÍ lo tenía (ver resolverClienteCredito en ordenesLavado.service.js); si
 * luego se le deshabilita el crédito, su deuda existente sigue siendo
 * cobrable — y la función RPC tampoco lo exige.
 *
 * @param {{ clienteId: number, ordenIds: number[] }} datos
 * @param {number} usuarioId quién registra el pago (se envía como p_usuario_id y también lo lee registrar_auditoria())
 * @returns {Promise<object>} el pago creado, con sus órdenes
 * @throws {NoEncontrado} si el cliente no existe, o alguna orden indicada no existe
 * @throws {Conflicto} si alguna orden no es del cliente, no es a crédito, no está entregada, o ya tiene pago
 * @throws {SolicitudInvalida} si el arreglo de órdenes viene vacío o con ids repetidos
 */
const registrarPagoCredito = async ({ clienteId, ordenIds }, usuarioId) => {
  await clientesService.obtenerClienteOFallar(clienteId);

  const { data: pagoId, error } = await crearClienteConUsuario(usuarioId).rpc(
    'registrar_pago_credito',
    { p_cliente_id: clienteId, p_orden_ids: ordenIds, p_usuario_id: usuarioId },
  );

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return obtenerPagoOFallar(pagoId);
};

module.exports = {
  listarClientesConCredito,
  listarOrdenesPendientesDeCliente,
  obtenerPagoPorId,
  obtenerPagoOFallar,
  listarPagos,
  registrarPagoCredito,
};
