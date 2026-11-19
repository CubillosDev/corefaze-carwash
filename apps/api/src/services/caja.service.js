const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const jornadasService = require('./jornadas.service');
const { aCamelCase } = require('../utils/mapearCampos');
const { ESTADOS_ORDEN, MEDIOS_PAGO } = require('../constants/dominio');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');
const { crearTraductorErroresPostgres } = require('../utils/traducirErrorPostgres');

const COLUMNAS_CAJA =
  'id, jornada_id, base_inicial, estado, abierta_por, abierta_en, cerrada_por, cerrada_en, ' +
  'efectivo_esperado, efectivo_contado, diferencia';

// Lo que necesita la caja para cobrar y para el comprobante: placa,
// vehículo, dueño (para proponer la empresa a crédito), servicio y
// colaborador. Nunca *.
const COLUMNAS_ORDEN =
  'id, jornada_id, fecha, turno, valor, estado, medio_pago, cliente_id, creado_en, entregada_en, ' +
  'vehiculo:vehiculos(id, placa, tipo_vehiculo, marca, color, ' +
  'cliente:clientes(id, nombre, tipo, credito_habilitado, estado)), ' +
  'servicio:servicios(id, numero, nombre, categoria), colaborador:colaboradores(id, codigo, nombre)';

const COLUMNAS_COBRO =
  'id, orden_id, caja_id, medio_pago, valor, recibido, cambio, registrado_por, creado_en, ' +
  `orden:ordenes_lavado(${COLUMNAS_ORDEN}, empresa:clientes!ordenes_lavado_cliente_id_fkey(id, nombre), vale:vales_credito(numero))`;

const COLUMNAS_EGRESO = 'id, caja_id, categoria, concepto, valor, registrado_por, creado_en';

/**
 * Las funciones de caja (agregar_caja.sql) redactan sus mensajes en español
 * para quien opera: se reenvían tal cual. Un CHECK de tabla (formato) que
 * se escape de los validadores es 400; una regla de negocio, 409.
 */
const traducirErrorPostgres = crearTraductorErroresPostgres({
  tabla: 'cajas',
  etiqueta: 'caja',
  mapeo: {
    23505: (error) => {
      if (error.message.includes('vales_credito_numero_key')) {
        return new Conflicto('Ese número de vale ya está registrado');
      }
      if (error.message.includes('idx_cajas_una_abierta')) {
        return new Conflicto('Ya hay una caja abierta');
      }
      return new Conflicto(
        error.message.startsWith('duplicate key') ? 'Registro duplicado' : error.message,
      );
    },
    23514: (error) =>
      error.message.includes('violates check constraint')
        ? new SolicitudInvalida([], 'Datos de caja inválidos')
        : new Conflicto(error.message),
    P0002: (error) => new NoEncontrado(error.message),
  },
});

const unaRelacion = (valor) => (Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null));

/** El vale llega como objeto o como arreglo según cómo resuelva PostgREST la relación 1:1. */
const normalizarOrden = (orden) => (orden ? { ...orden, vale: unaRelacion(orden.vale) } : orden);

const consultar = async (consulta, contexto) => {
  const { data, error } = await consulta;
  if (error) {
    throw new Error(`No se pudo consultar ${contexto}: ${error.message}`);
  }
  return aCamelCase(data);
};

const cajaDeJornada = (jornadaId) =>
  consultar(
    supabase.from('cajas').select(COLUMNAS_CAJA).eq('jornada_id', jornadaId).maybeSingle(),
    'la caja',
  );

const obtenerCajaOFallar = async (id) => {
  const caja = await consultar(
    supabase.from('cajas').select(COLUMNAS_CAJA).eq('id', id).maybeSingle(),
    'la caja',
  );
  if (!caja) {
    throw new NoEncontrado('Caja no encontrada');
  }
  return caja;
};

const ordenesEnEstado = (estados) =>
  consultar(
    supabase
      .from('ordenes_lavado')
      .select(COLUMNAS_ORDEN)
      .in('estado', estados)
      .order('turno', { ascending: true }),
    'las órdenes',
  );

const cobrosDeCaja = async (cajaId) => {
  const cobros = await consultar(
    supabase
      .from('cobros_caja')
      .select(COLUMNAS_COBRO)
      .eq('caja_id', cajaId)
      .order('creado_en', { ascending: false }),
    'los cobros',
  );
  return cobros.map((cobro) => ({ ...cobro, orden: normalizarOrden(cobro.orden) }));
};

const egresosDeCaja = (cajaId) =>
  consultar(
    supabase
      .from('egresos_caja')
      .select(COLUMNAS_EGRESO)
      .eq('caja_id', cajaId)
      .order('creado_en', { ascending: false }),
    'los egresos',
  );

const ultimaJornada = async () => {
  const jornadas = await consultar(
    supabase.from('jornadas').select('id').order('fecha', { ascending: false }).limit(1),
    'la última jornada',
  );
  return jornadas[0] ? jornadasService.obtenerJornadaPorId(jornadas[0].id) : null;
};

const sumarValores = (lista) => lista.reduce((total, elemento) => total + elemento.valor, 0);

/**
 * Totales de la caja, siempre en el servidor (el web nunca calcula dinero).
 * El efectivo esperado es el mismo cálculo de cerrar_caja(): base + cobros
 * en efectivo − egresos.
 */
const calcularTotales = (caja, cobros, egresos, porCobrar) => {
  const porMedio = Object.fromEntries(Object.values(MEDIOS_PAGO).map((medio) => [medio, 0]));
  cobros.forEach((cobro) => {
    porMedio[cobro.medioPago] += cobro.valor;
  });
  const cobrado = sumarValores(cobros);
  const egresos_ = sumarValores(egresos);

  return {
    cobrado,
    cobros: cobros.length,
    ticketPromedio: cobros.length ? Math.round(cobrado / cobros.length) : 0,
    porMedio,
    egresos: egresos_,
    efectivoEsperado: caja ? caja.baseInicial + porMedio[MEDIOS_PAGO.EFECTIVO] - egresos_ : 0,
    porCobrar: sumarValores(porCobrar),
    vehiculosPorCobrar: porCobrar.length,
  };
};

/**
 * Estado de la caja de una jornada (por defecto, la abierta o, si no hay,
 * la última): la caja, sus totales, sus cobros y egresos, las órdenes
 * terminadas por cobrar y las que siguen en el patio.
 *
 * @param {{ jornadaId?: number }} [filtros]
 */
const obtenerEstado = async ({ jornadaId } = {}) => {
  const jornada = jornadaId
    ? await jornadasService.obtenerJornadaOFallar(jornadaId)
    : ((await jornadasService.obtenerJornadaAbierta()) ?? (await ultimaJornada()));

  const caja = jornada ? await cajaDeJornada(jornada.id) : null;
  const [porCobrar, enPatio, cobros, egresos] = await Promise.all([
    ordenesEnEstado([ESTADOS_ORDEN.TERMINADA]),
    ordenesEnEstado([ESTADOS_ORDEN.REGISTRADA, ESTADOS_ORDEN.EN_PROCESO]),
    caja ? cobrosDeCaja(caja.id) : [],
    caja ? egresosDeCaja(caja.id) : [],
  ]);

  return {
    jornada,
    caja,
    totales: calcularTotales(caja, cobros, egresos, porCobrar),
    porCobrar: porCobrar.map(normalizarOrden),
    enPatio: enPatio.map(normalizarOrden),
    cobros,
    egresos,
  };
};

const ejecutar = async (usuarioId, funcion, parametros) => {
  const { data, error } = await crearClienteConUsuario(usuarioId).rpc(funcion, parametros);
  if (error) {
    throw traducirErrorPostgres(error);
  }
  return data;
};

/** Abre la caja de la jornada abierta con su base en efectivo. */
const abrirCaja = async ({ baseInicial }, usuarioId) => {
  const id = await ejecutar(usuarioId, 'abrir_caja', {
    p_base_inicial: baseInicial,
    p_usuario_id: usuarioId,
  });
  return obtenerCajaOFallar(id);
};

/** Registra un egreso de efectivo en la caja abierta. */
const registrarEgreso = async ({ categoria, concepto = null, valor }, usuarioId) => {
  const id = await ejecutar(usuarioId, 'registrar_egreso_caja', {
    p_categoria: categoria,
    p_concepto: concepto,
    p_valor: valor,
    p_usuario_id: usuarioId,
  });
  return consultar(
    supabase.from('egresos_caja').select(COLUMNAS_EGRESO).eq('id', id).single(),
    'el egreso',
  );
};

/**
 * Cobra y entrega una orden terminada (terminada -> entregada). Devuelve el
 * cobro con la orden, que es lo que necesita el comprobante.
 */
const registrarCobro = async (
  { ordenId, medioPago, recibido = null, clienteId = null, numeroVale = null },
  usuarioId,
) => {
  const id = await ejecutar(usuarioId, 'registrar_cobro', {
    p_orden_id: ordenId,
    p_medio_pago: medioPago,
    p_recibido: recibido,
    p_cliente_id: clienteId,
    p_numero_vale: numeroVale,
    p_usuario_id: usuarioId,
  });
  const cobro = await consultar(
    supabase.from('cobros_caja').select(COLUMNAS_COBRO).eq('id', id).single(),
    'el cobro',
  );
  return { ...cobro, orden: normalizarOrden(cobro.orden) };
};

/** Cierra la caja abierta con el arqueo. */
const cerrarCaja = async ({ efectivoContado }, usuarioId) => {
  const id = await ejecutar(usuarioId, 'cerrar_caja', {
    p_efectivo_contado: efectivoContado,
    p_usuario_id: usuarioId,
  });
  return obtenerCajaOFallar(id);
};

/** Reabre una caja cerrada. */
const reabrirCaja = async (id, usuarioId) => {
  await obtenerCajaOFallar(id);
  await ejecutar(usuarioId, 'reabrir_caja', { p_caja_id: id, p_usuario_id: usuarioId });
  return obtenerCajaOFallar(id);
};

module.exports = {
  obtenerEstado,
  abrirCaja,
  registrarEgreso,
  registrarCobro,
  cerrarCaja,
  reabrirCaja,
  calcularTotales,
};
