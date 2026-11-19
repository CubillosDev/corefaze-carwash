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
  'id, nombre, documento, telefono, email, estado, credito_habilitado, tipo, cupo_credito, dia_corte, contacto';

// vehiculo/servicio/colaborador son selects anidados sobre una FK directa
// de ordenes_lavado (vehiculo_id, servicio_id, colaborador_id): mismo
// patrón que el embed de tarifas_servicio en servicios.service.js, solo
// que aquí la FK es directa en vez de inversa. Reemplaza los *_id crudos
// que tenía antes esta lista: lo que necesita quien va a pagar o a
// revisar un pago ya pagado es placa/nombre/código, no un id interno.
// estado y vale (ADR 0007): la pestaña de pendientes del diseño muestra el
// vale de cada servicio y si ya se recibió.
const COLUMNAS_ORDEN_LEGIBLE =
  'id, fecha, turno, valor, estado, ' +
  'vehiculo:vehiculos(placa), servicio:servicios(nombre), colaborador:colaboradores(codigo, nombre), ' +
  'vale:vales_credito(numero, verificado_en)';

// Nunca *: así nunca se filtran creado_en ni columnas internas mientras el
// contrato HTTP no las incluya (ver supabase/README.md, "Contrato de
// integración con la API"). El alias "ordenes" es el mismo patrón de
// tarifas/reaperturas (select anidado sobre la relación inversa de una FK):
// ordenes_lavado.pago_credito_id -> pagos_credito.id.
const COLUMNAS_PAGO =
  'id, cliente_id, valor_total, registrado_por, pagado_en, detalle:detalles_pago_credito(medio), ' +
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
// vale (ordenes_lavado <- vales_credito) y detalle (pagos_credito <-
// detalles_pago_credito) son relaciones 1:1: según cómo las resuelva
// PostgREST llegan como objeto o como arreglo. Siempre se entregan como
// objeto o null.
const unaRelacion = (valor) => (Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null));
const normalizarOrden = (orden) => ({ ...orden, vale: unaRelacion(orden.vale) });
const normalizarPago = (pago) => ({
  ...pago,
  detalle: unaRelacion(pago.detalle),
  ordenes: (pago.ordenes ?? []).map(normalizarOrden),
});

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

  return aCamelCase(ordenes).map(normalizarOrden);
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

  return data ? normalizarPago(aCamelCase(data)) : null;
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
    pagos: aCamelCase(data).map(normalizarPago),
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
const registrarPagoCredito = async ({ clienteId, ordenIds, medio }, usuarioId) => {
  await clientesService.obtenerClienteOFallar(clienteId);

  // Con medio (ADR 0007), el pago exige vales verificados y guarda cómo se
  // pagó. Sin medio se conserva el contrato original de SCRUM-160.
  const { data: pagoId, error } = medio
    ? await crearClienteConUsuario(usuarioId).rpc('registrar_pago_credito_con_medio', {
        p_cliente_id: clienteId,
        p_orden_ids: ordenIds,
        p_usuario_id: usuarioId,
        p_medio: medio,
      })
    : await crearClienteConUsuario(usuarioId).rpc('registrar_pago_credito', {
        p_cliente_id: clienteId,
        p_orden_ids: ordenIds,
        p_usuario_id: usuarioId,
      });

  if (error) {
    throw traducirErrorPostgres(error);
  }

  return obtenerPagoOFallar(pagoId);
};

// ---------------------------------------------------------------------
// Cupo, corte, contacto y vales (ADR 0007, diseño del módulo Crédito)
// ---------------------------------------------------------------------

/**
 * Órdenes a crédito de una empresa para las pestañas del diseño:
 * - pendientes: sin pago y no canceladas, en cualquier estado (la deuda
 *   existe desde que se registra la orden), con su vale.
 * - pagadas: con su pago (fecha y medio).
 *
 * @param {number|string} clienteId
 * @param {{ tipo?: 'pendientes'|'pagadas' }} [filtros]
 */
const listarOrdenesCreditoDeCliente = async (clienteId, { tipo = 'pendientes' } = {}) => {
  await clientesService.obtenerClienteOFallar(clienteId);
  const pagadas = tipo === 'pagadas';
  const columnas = pagadas
    ? `${COLUMNAS_ORDEN_LEGIBLE}, pago:pagos_credito(id, pagado_en, detalle:detalles_pago_credito(medio))`
    : COLUMNAS_ORDEN_LEGIBLE;

  const ordenes = await traerTodasLasFilas((desde, hasta) => {
    const consulta = supabase
      .from('ordenes_lavado')
      .select(columnas)
      .eq('cliente_id', clienteId)
      .eq('medio_pago', MEDIOS_PAGO.CREDITO)
      .neq('estado', ESTADOS_ORDEN.CANCELADA);
    return (pagadas ? consulta.not('pago_credito_id', 'is', null) : consulta.is('pago_credito_id', null))
      .order('fecha', { ascending: false })
      .order('turno', { ascending: false })
      .range(desde, hasta);
  });

  return aCamelCase(ordenes).map((orden) => {
    const normalizada = normalizarOrden(orden);
    return orden.pago
      ? { ...normalizada, pago: { ...orden.pago, detalle: unaRelacion(orden.pago.detalle) } }
      : normalizada;
  });
};

/**
 * Cupo, día de corte y contacto de una empresa. Solo una empresa los tiene
 * (clientes_condiciones_credito_check).
 */
const actualizarCondiciones = async (clienteId, { cupoCredito = null, diaCorte = null, contacto = null }, usuarioId) => {
  const cliente = await clientesService.obtenerClienteOFallar(clienteId);
  if (cliente.tipo !== 'empresa') {
    throw new Conflicto('Solo una empresa tiene condiciones de crédito');
  }

  const { error } = await crearClienteConUsuario(usuarioId)
    .from('clientes')
    .update({ cupo_credito: cupoCredito, dia_corte: diaCorte, contacto })
    .eq('id', clienteId);
  if (error) {
    throw new SolicitudInvalida([], 'Condiciones de crédito inválidas');
  }

  const { data, error: errorLectura } = await supabase
    .from('clientes')
    .select(COLUMNAS_CLIENTE_CON_CREDITO)
    .eq('id', clienteId)
    .single();
  if (errorLectura) {
    throw new Error(`No se pudo leer el cliente: ${errorLectura.message}`);
  }
  return aCamelCase(data);
};

const COLUMNAS_VALE =
  'id, orden_id, cliente_id, numero, verificado_en, verificado_por, creado_en, ' +
  'cliente:clientes(id, nombre), orden:ordenes_lavado(id, fecha, turno, valor, estado, pago_credito_id, ' +
  'vehiculo:vehiculos(placa), servicio:servicios(nombre))';

const leerVale = async (filtro, valor) => {
  const { data, error } = await supabase.from('vales_credito').select(COLUMNAS_VALE).eq(filtro, valor).maybeSingle();
  if (error) {
    throw new Error(`No se pudo consultar el vale: ${error.message}`);
  }
  return data ? aCamelCase(data) : null;
};

const traducirErrorVale = crearTraductorErroresPostgres({
  tabla: 'vales_credito',
  etiqueta: 'vale',
  mapeo: {
    23505: (error) =>
      error.message.includes('vales_credito_orden_id_key')
        ? new Conflicto('Esa orden ya tiene un vale')
        : new Conflicto('Ese número de vale ya está registrado'),
    23514: (error) =>
      error.message.includes('violates check constraint')
        ? new SolicitudInvalida([], 'Datos del vale inválidos')
        : new Conflicto(error.message),
  },
});

/** Marca o desmarca el vale de una orden como recibido (casilla del diseño). */
const marcarVerificacion = async (ordenId, verificado, usuarioId) => {
  const actual = await leerVale('orden_id', ordenId);
  if (!actual) {
    throw new NoEncontrado('La orden no tiene vale registrado');
  }
  const { error } = await crearClienteConUsuario(usuarioId)
    .from('vales_credito')
    .update(
      verificado
        ? { verificado_en: new Date().toISOString(), verificado_por: usuarioId }
        : { verificado_en: null, verificado_por: null },
    )
    .eq('orden_id', ordenId);
  if (error) {
    throw traducirErrorVale(error);
  }
  return leerVale('orden_id', ordenId);
};

/** Registra el vale de una orden a crédito que todavía no lo tiene. */
const registrarVale = async ({ ordenId, numero }, usuarioId) => {
  const { data: orden, error } = await supabase
    .from('ordenes_lavado')
    .select('id, cliente_id, medio_pago')
    .eq('id', ordenId)
    .maybeSingle();
  if (error) {
    throw new Error(`No se pudo consultar la orden: ${error.message}`);
  }
  if (!orden) {
    throw new NoEncontrado('Orden de lavado no encontrada');
  }
  if (orden.medio_pago !== MEDIOS_PAGO.CREDITO) {
    throw new Conflicto('Solo una orden a crédito lleva vale');
  }

  const { error: errorInsercion } = await crearClienteConUsuario(usuarioId)
    .from('vales_credito')
    .insert({ orden_id: ordenId, cliente_id: orden.cliente_id, numero, creado_por: usuarioId });
  if (errorInsercion) {
    throw traducirErrorVale(errorInsercion);
  }
  return leerVale('orden_id', ordenId);
};

/**
 * "Verificar vale" del diseño: busca el número y, si es de esa empresa y
 * sigue pendiente, lo marca como recibido. Devuelve qué pasó para que el
 * panel muestre el mensaje: coincide, ya pagado, de otra empresa o no existe.
 *
 * @returns {Promise<{ resultado: 'coincide'|'pagado'|'otra_empresa'|'no_existe', vale: object|null }>}
 */
const verificarVale = async ({ clienteId, numero }, usuarioId) => {
  const vale = await leerVale('numero', numero);
  if (!vale) {
    return { resultado: 'no_existe', vale: null };
  }
  if (vale.clienteId !== clienteId) {
    return { resultado: 'otra_empresa', vale: { numero: vale.numero } };
  }
  if (vale.orden?.pagoCreditoId) {
    return { resultado: 'pagado', vale };
  }
  if (!vale.verificadoEn) {
    return { resultado: 'coincide', vale: await marcarVerificacion(vale.ordenId, true, usuarioId) };
  }
  return { resultado: 'coincide', vale };
};

module.exports = {
  listarClientesConCredito,
  listarOrdenesPendientesDeCliente,
  listarOrdenesCreditoDeCliente,
  obtenerPagoPorId,
  obtenerPagoOFallar,
  listarPagos,
  registrarPagoCredito,
  actualizarCondiciones,
  registrarVale,
  verificarVale,
  marcarVerificacion,
};
