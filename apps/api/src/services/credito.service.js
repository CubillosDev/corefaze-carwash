const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const {
  TAMANO_PAGINA_AGREGADO,
  traerTodasLasFilas,
  trocear,
} = require('../utils/paginarPostgrest');
const clientesService = require('./clientes.service');
const { ESTADOS_ORDEN, MEDIOS_PAGO } = require('../constants/dominio');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');
const { crearTraductorErroresPostgres } = require('../utils/traducirErrorPostgres');

const POR_PAGINA_DEFECTO_PAGOS = 20;
const POR_PAGINA_MAXIMO_PAGOS = 100;

// credito_habilitado se expone (no solo se filtra por él): un cliente con
// deuda pendiente puede aparecer en listarClientesConCredito aunque ya lo
// tenga en false (ver su JSDoc), y sin este campo no habría forma de
// distinguir ese caso desde la respuesta.
const COLUMNAS_CLIENTE_CON_CREDITO =
  'id, nombre, documento, telefono, email, estado, credito_habilitado';

// vehiculo/servicio/colaborador son selects anidados sobre una FK directa
// de ordenes_lavado (vehiculo_id, servicio_id, colaborador_id): mismo
// patrón que el embed de tarifas_servicio en servicios.service.js, solo
// que aquí la FK es directa en vez de inversa. Reemplaza los *_id crudos
// que tenía antes esta lista: lo que necesita quien va a pagar o a
// revisar un pago ya pagado es placa/nombre/código, no un id interno.
const COLUMNAS_ORDEN_LEGIBLE =
  'id, fecha, turno, valor, ' +
  'vehiculo:vehiculos(placa), servicio:servicios(nombre), colaborador:colaboradores(codigo, nombre)';

// Nunca *: así nunca se filtran creado_en ni columnas internas mientras el
// contrato HTTP no las incluya (ver supabase/README.md, "Contrato de
// integración con la API"). El alias "ordenes" es el mismo patrón de
// tarifas/reaperturas (select anidado sobre la relación inversa de una FK):
// ordenes_lavado.pago_credito_id -> pagos_credito.id.
const COLUMNAS_PAGO =
  'id, cliente_id, valor_total, registrado_por, pagado_en, ' +
  `ordenes:ordenes_lavado(${COLUMNAS_ORDEN_LEGIBLE})`;

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
 * Lista los clientes con crédito: con credito_habilitado=true, O con
 * deuda pendiente aunque ya se les haya deshabilitado el crédito (una
 * orden a crédito solo pudo crearse cuando el cliente SÍ lo tenía
 * habilitado — ver resolverClienteCredito en ordenesLavado.service.js —
 * y deshabilitarlo después no borra esa deuda ni la hace menos cobrable).
 *
 * Por cliente devuelve:
 * - saldoPendiente: suma de TODAS sus órdenes a crédito no canceladas y
 *   sin pago (pago_credito_id is null), sin importar su estado operativo
 *   (registrada/en_proceso/terminada/entregada) — la deuda existe desde
 *   que se registra la orden.
 * - saldoPagable y cantidadOrdenesPagables: el subconjunto de lo anterior
 *   que además está 'entregada' (R11), es decir lo que de verdad se puede
 *   pagar ahora con registrarPagoCredito (ver listarOrdenesPendientesDeCliente).
 *
 * @returns {Promise<Array<object>>}
 */
const listarClientesConCredito = async () => {
  const ordenesPendientesDePago = await traerTodasLasFilas((desde, hasta) =>
    supabase
      .from('ordenes_lavado')
      .select('cliente_id, valor, estado')
      .eq('medio_pago', MEDIOS_PAGO.CREDITO)
      .is('pago_credito_id', null)
      .neq('estado', ESTADOS_ORDEN.CANCELADA)
      .order('id', { ascending: true })
      .range(desde, hasta),
  );

  const saldosPorCliente = new Map();
  ordenesPendientesDePago.forEach(({ cliente_id: clienteId, valor, estado }) => {
    const saldo = saldosPorCliente.get(clienteId) ?? {
      saldoPendiente: 0,
      saldoPagable: 0,
      cantidadOrdenesPagables: 0,
    };
    saldo.saldoPendiente += valor;
    if (estado === ESTADOS_ORDEN.ENTREGADA) {
      saldo.saldoPagable += valor;
      saldo.cantidadOrdenesPagables += 1;
    }
    saldosPorCliente.set(clienteId, saldo);
  });

  const clientesConCreditoHabilitado = await traerTodasLasFilas((desde, hasta) =>
    supabase
      .from('clientes')
      .select('id')
      .eq('credito_habilitado', true)
      .order('id', { ascending: true })
      .range(desde, hasta),
  );

  const idsRelevantes = [
    ...new Set([
      ...clientesConCreditoHabilitado.map((cliente) => cliente.id),
      ...saldosPorCliente.keys(),
    ]),
  ];

  if (idsRelevantes.length === 0) {
    return [];
  }

  const paginasDeClientes = await Promise.all(
    trocear(idsRelevantes, TAMANO_PAGINA_AGREGADO).map(async (grupo) => {
      const { data, error } = await supabase
        .from('clientes')
        .select(COLUMNAS_CLIENTE_CON_CREDITO)
        .in('id', grupo);

      if (error) {
        throw new Error(`No se pudo listar los clientes con crédito: ${error.message}`);
      }
      return data;
    }),
  );

  const saldoVacio = { saldoPendiente: 0, saldoPagable: 0, cantidadOrdenesPagables: 0 };

  return aCamelCase(paginasDeClientes.flat())
    .map((cliente) => ({ ...cliente, ...(saldosPorCliente.get(cliente.id) ?? saldoVacio) }))
    .sort((a, b) => a.id - b.id);
};

/**
 * Lista las órdenes de un cliente que se pueden pagar AHORA MISMO: a
 * crédito, 'entregada' y sin pago previo (R11, ver ADR 0005: "solo se
 * paga una orden entregada"). Es el conjunto exacto de ordenIds válidos
 * para registrarPagoCredito — a diferencia del saldo pendiente (que
 * incluye órdenes aún no entregadas), esta lista solo trae lo pagable.
 * Paginada internamente igual que listarClientesConCredito: un cliente
 * con un backlog muy grande no debe perder órdenes pagables más allá de
 * la fila 1000 (ver traerTodasLasFilas).
 *
 * @param {number|string} clienteId
 * @returns {Promise<Array<object>>}
 * @throws {NoEncontrado} si el cliente no existe
 */
const listarOrdenesPendientesDeCliente = async (clienteId) => {
  await clientesService.obtenerClienteOFallar(clienteId);

  const ordenes = await traerTodasLasFilas((desde, hasta) =>
    supabase
      .from('ordenes_lavado')
      .select(COLUMNAS_ORDEN_LEGIBLE)
      .eq('cliente_id', clienteId)
      .eq('medio_pago', MEDIOS_PAGO.CREDITO)
      .eq('estado', ESTADOS_ORDEN.ENTREGADA)
      .is('pago_credito_id', null)
      .order('fecha', { ascending: true })
      .range(desde, hasta),
  );

  return aCamelCase(ordenes);
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
 * Lista el historial de pagos de crédito paginado, opcionalmente
 * filtrado por cliente. Mismo criterio de paginación que
 * listarUsuarios en usuarios.service.js: pagina/porPagina (máx. 100) y
 * total vía { count: 'exact' }.
 *
 * @param {{ clienteId?: number, pagina?: number, porPagina?: number }} [filtros]
 * @returns {Promise<{ pagos: object[], total: number, pagina: number, porPagina: number, totalPaginas: number }>}
 */
const listarPagos = async ({
  clienteId,
  pagina = 1,
  porPagina = POR_PAGINA_DEFECTO_PAGOS,
} = {}) => {
  const porPaginaEfectivo = Math.min(porPagina, POR_PAGINA_MAXIMO_PAGOS);

  let consulta = supabase.from('pagos_credito').select(COLUMNAS_PAGO, { count: 'exact' });

  if (clienteId !== undefined) {
    consulta = consulta.eq('cliente_id', clienteId);
  }

  const desde = (pagina - 1) * porPaginaEfectivo;
  const hasta = desde + porPaginaEfectivo - 1;

  const { data, count, error } = await consulta
    .order('pagado_en', { ascending: false })
    .range(desde, hasta);

  if (error) {
    throw new Error(`No se pudo listar los pagos de crédito: ${error.message}`);
  }

  return {
    pagos: aCamelCase(data),
    total: count,
    pagina,
    porPagina: porPaginaEfectivo,
    totalPaginas: Math.max(1, Math.ceil(count / porPaginaEfectivo)),
  };
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
