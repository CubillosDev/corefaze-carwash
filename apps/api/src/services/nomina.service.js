const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const {
  TAMANO_PAGINA_AGREGADO,
  traerTodasLasFilas,
  trocear,
} = require('../utils/paginarPostgrest');
const colaboradoresService = require('./colaboradores.service');
const { TIPOS_DESCUENTO } = require('../constants/dominio');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');
const { crearTraductorErroresPostgres } = require('../utils/traducirErrorPostgres');
const { fechaDeHoyEnBogota } = require('../utils/fechaNegocio');

const POR_PAGINA_DEFECTO_LIQUIDACIONES = 20;
const POR_PAGINA_MAXIMO_LIQUIDACIONES = 100;

const COLUMNAS_DESCUENTO =
  'id, colaborador_id, fecha, tipo, valor, observacion, registrado_por, liquidacion_id, creado_en';

// colaborador es un select anidado sobre la FK directa de
// liquidacion_colaboradores.colaborador_id -> colaboradores.id: mismo
// patrón que vehiculo/servicio/colaborador en credito.service.js.
const COLUMNAS_DETALLE_LIQUIDACION_COLABORADOR =
  'colaborador_id, servicios, producido, comision, descuentos, saldo_pendiente, neto, ' +
  'colaborador:colaboradores(codigo, nombre)';

// "colaboradores" es un select anidado sobre la relación inversa de una
// FK (liquidacion_colaboradores.liquidacion_id -> liquidaciones_nomina.id),
// igual patrón que "ordenes" en pagos_credito.
const COLUMNAS_LIQUIDACION =
  'id, periodo_inicio, periodo_fin, total_comision, total_descuentos, total_neto, liquidado_por, liquidado_en, ' +
  `colaboradores:liquidacion_colaboradores(${COLUMNAS_DETALLE_LIQUIDACION_COLABORADOR})`;

/**
 * Traduce un error de Postgres de registrar_descuento() a una clase de
 * utils/errores.js. 23514 agrupa formato (valor <= 0, tipo inválido —
 * ambos ya rechazados antes por nomina.validator.js, así que en la
 * práctica son inalcanzables vía la API real, igual que el caso
 * documentado en credito.service.js) y reglas de negocio (colaborador
 * inactivo, quincena ya liquidada, préstamo por encima del disponible).
 */
const traducirErrorRegistrarDescuento = crearTraductorErroresPostgres({
  tabla: 'descuentos_colaborador',
  etiqueta: 'descuento',
  mapeo: {
    23514: (error) =>
      /mayor que cero|Tipo de descuento inválido/.test(error.message)
        ? new SolicitudInvalida([{ campo: 'valor', mensaje: error.message }])
        : new Conflicto(error.message),
    // 23503 foreign_key_violation: el colaborador indicado no existe.
    23503: (error) => new NoEncontrado(error.message),
  },
});

/**
 * Traduce un error de Postgres de liquidar_quincena() a una clase de
 * utils/errores.js. 23514 agrupa formato (periodo que no es una quincena
 * real) y reglas de negocio (quincena aún no terminada, ya existe una
 * liquidación posterior, hay órdenes abiertas, préstamos por encima de
 * la comisión — esta última inalcanzable hoy, R13/R14 ya lo impiden
 * antes). 23505 es el UNIQUE(periodo_inicio, periodo_fin): a diferencia
 * de los otros mensajes, liquidar_quincena no redacta uno propio para
 * este caso (confía en el UNIQUE), así que aquí sí se escribe uno.
 */
const traducirErrorLiquidarQuincena = crearTraductorErroresPostgres({
  tabla: 'liquidaciones_nomina',
  etiqueta: 'liquidación de nómina',
  mapeo: {
    23514: (error) =>
      /no es una quincena válida/.test(error.message)
        ? new SolicitudInvalida([{ campo: 'fin', mensaje: error.message }])
        : new Conflicto(error.message),
    23505: () => new Conflicto('Esta quincena ya fue liquidada'),
  },
});

const sumar = (filas, campo) => filas.reduce((total, fila) => total + Number(fila[campo] ?? 0), 0);

/**
 * Resumen proyectado de una quincena: por cada colaborador con alguna
 * orden O descuento en el periodo — la misma unión (colaboradores_periodo)
 * que usa liquidar_quincena, sin filtrar por estado activo/inactivo: un
 * colaborador ya inactivo que tuvo órdenes en la quincena igual se
 * liquida, así que debe aparecer aquí igual. Por colaborador: servicios,
 * producido, comisión, descuentos por tipo, neto y saldo pendiente
 * PROYECTADOS (lo que liquidar_quincena calcularía si se liquidara ahora
 * mismo). Además: los totales, los descuentos del periodo, si ya fue
 * liquidada y si ya se puede liquidar (la quincena terminó).
 *
 * Todo el cálculo lo hace resumen_nomina_periodo() en UNA consulta, con las
 * mismas funciones del dominio que liquidar_quincena()
 * (comision_colaborador_periodo, descuentos_colaborador_periodo): nunca se
 * trae una orden o un descuento a memoria para sumarlo en JS, ni se hace
 * una consulta por colaborador.
 *
 * inicio/fin deben ser exactamente los límites de una quincena real
 * (1–15 o 16–fin de mes): se valida contra limites_quincena(), la misma
 * función que usa liquidar_quincena(), nunca reimplementada en JS.
 *
 * @param {{ inicio: string, fin: string }} periodo fechas ISO (YYYY-MM-DD)
 * @returns {Promise<{ inicio: string, fin: string, liquidada: boolean, liquidacionId: number|null, puedeLiquidar: boolean, totales: object, colaboradores: object[], descuentosDelPeriodo: object[] }>}
 * @throws {SolicitudInvalida} si [inicio, fin] no es exactamente una quincena real
 */
const obtenerResumenQuincena = async ({ inicio, fin }) => {
  const { data: rango, error: errorRango } = await supabase.rpc('limites_quincena', {
    p_fecha: inicio,
  });

  if (errorRango) {
    throw new Error(`No se pudo validar el periodo: ${errorRango.message}`);
  }

  if (rango.inicio !== inicio || rango.fin !== fin) {
    throw new SolicitudInvalida([
      { campo: 'fin', mensaje: `El periodo ${inicio} – ${fin} no es una quincena válida` },
    ]);
  }

  const [resumen, liquidacion, descuentosDelPeriodo] = await Promise.all([
    supabase
      .rpc('resumen_nomina_periodo', { p_inicio: inicio, p_fin: fin })
      .then(({ data, error }) => {
        if (error) {
          throw new Error(`No se pudo calcular el resumen de nómina: ${error.message}`);
        }
        return data ?? [];
      }),
    supabase
      .from('liquidaciones_nomina')
      .select('id')
      .eq('periodo_inicio', inicio)
      .eq('periodo_fin', fin)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          throw new Error(`No se pudo verificar si la quincena ya fue liquidada: ${error.message}`);
        }
        return data;
      }),
    traerTodasLasFilas((desde, hasta) =>
      supabase
        .from('descuentos_colaborador')
        .select(`${COLUMNAS_DESCUENTO}, colaborador:colaboradores(codigo, nombre)`)
        .gte('fecha', inicio)
        .lte('fecha', fin)
        .order('fecha', { ascending: false })
        .order('id', { ascending: false })
        .range(desde, hasta),
    ),
  ]);

  // El estado (activo/inactivo) no lo trae resumen_nomina_periodo: una sola
  // consulta más, por lotes, para todos los colaboradores del resumen.
  const ids = resumen.map((fila) => fila.colaborador_id);
  const estados = new Map();
  for (const grupo of trocear(ids, TAMANO_PAGINA_AGREGADO)) {
    const { data, error } = await supabase
      .from('colaboradores')
      .select('id, estado')
      .in('id', grupo);
    if (error) {
      throw new Error(
        `No se pudo obtener los colaboradores con actividad en el periodo: ${error.message}`,
      );
    }
    data.forEach((colaborador) => estados.set(colaborador.id, colaborador.estado));
  }

  const colaboradores = resumen
    .map((fila) => ({
      colaboradorId: fila.colaborador_id,
      codigo: fila.codigo,
      nombre: fila.nombre,
      estado: estados.get(fila.colaborador_id),
      servicios: fila.servicios,
      producido: Number(fila.producido),
      comision: fila.comision,
      descuentos: {
        [TIPOS_DESCUENTO.PRESTAMO]: fila.prestamos,
        [TIPOS_DESCUENTO.JABON]: fila.jabon,
        [TIPOS_DESCUENTO.MULTA]: fila.multas,
        [TIPOS_DESCUENTO.CXC]: fila.cxc,
      },
      descuentosTotal: fila.descuentos,
      neto: fila.neto,
      saldoPendiente: fila.saldo_pendiente,
    }))
    .sort((a, b) => a.colaboradorId - b.colaboradorId);

  return {
    inicio,
    fin,
    liquidada: Boolean(liquidacion),
    liquidacionId: liquidacion?.id ?? null,
    puedeLiquidar: !liquidacion && fechaDeHoyEnBogota() >= fin,
    totales: {
      servicios: sumar(colaboradores, 'servicios'),
      producido: sumar(colaboradores, 'producido'),
      comision: sumar(colaboradores, 'comision'),
      descuentos: sumar(colaboradores, 'descuentosTotal'),
      neto: sumar(colaboradores, 'neto'),
      saldoPendiente: sumar(colaboradores, 'saldoPendiente'),
    },
    colaboradores,
    descuentosDelPeriodo: aCamelCase(descuentosDelPeriodo),
  };
};

/**
 * Lista los descuentos de un colaborador en un periodo (no necesariamente
 * una quincena completa).
 * @param {number|string} colaboradorId
 * @param {{ inicio: string, fin: string }} periodo
 * @returns {Promise<{ colaborador: object, descuentos: object[] }>}
 * @throws {NoEncontrado} si el colaborador no existe
 */
const listarDescuentosDeColaborador = async (colaboradorId, { inicio, fin }) => {
  const colaborador = await colaboradoresService.obtenerColaboradorOFallar(colaboradorId);

  const descuentos = await traerTodasLasFilas((desde, hasta) =>
    supabase
      .from('descuentos_colaborador')
      .select(COLUMNAS_DESCUENTO)
      .eq('colaborador_id', colaboradorId)
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('fecha', { ascending: true })
      .range(desde, hasta),
  );

  return {
    colaborador: { id: colaborador.id, codigo: colaborador.codigo, nombre: colaborador.nombre },
    descuentos: aCamelCase(descuentos),
  };
};

/**
 * Obtiene un descuento por id.
 * @param {number|string} id
 * @returns {Promise<object | null>}
 */
const obtenerDescuentoPorId = async (id) => {
  const { data, error } = await supabase
    .from('descuentos_colaborador')
    .select(COLUMNAS_DESCUENTO)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener el descuento: ${error.message}`);
  }

  return data ? aCamelCase(data) : null;
};

/**
 * Obtiene un descuento por id, o lanza NoEncontrado (404).
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NoEncontrado}
 */
const obtenerDescuentoOFallar = async (id) => {
  const descuento = await obtenerDescuentoPorId(id);
  if (!descuento) {
    throw new NoEncontrado('Descuento no encontrado');
  }
  return descuento;
};

/**
 * Registra un descuento contra la quincena en curso de un colaborador,
 * vía registrar_descuento(): solo 'prestamo' tiene límite por comisión
 * disponible (ver la migración); los demás tipos no.
 *
 * @param {{ colaboradorId: number, tipo: string, valor: number, fecha: string, observacion?: string }} datos
 * @param {number} usuarioId quién registra el descuento (p_usuario_id, y lo lee registrar_auditoria())
 * @returns {Promise<object>} el descuento creado
 * @throws {NoEncontrado} si el colaborador no existe
 * @throws {Conflicto} si el colaborador no está activo, la quincena ya fue liquidada, o (solo préstamo) supera el disponible
 * @throws {SolicitudInvalida} si el valor o el tipo no son válidos (defensa en profundidad; ya los rechaza el validador antes)
 */
const registrarDescuento = async (
  { colaboradorId, tipo, valor, fecha, observacion },
  usuarioId,
) => {
  const { data: id, error } = await crearClienteConUsuario(usuarioId).rpc('registrar_descuento', {
    p_colaborador_id: colaboradorId,
    p_tipo: tipo,
    p_valor: valor,
    p_fecha: fecha,
    p_usuario_id: usuarioId,
    p_observacion: observacion ?? null,
  });

  if (error) {
    throw traducirErrorRegistrarDescuento(error);
  }

  return obtenerDescuentoOFallar(id);
};

/**
 * Liquida una quincena completa vía liquidar_quincena(): todo o nada
 * (congela comisión/descuentos/neto/saldo_pendiente por colaborador,
 * marca las órdenes y descuentos del periodo, y crea el cxc de la
 * quincena siguiente si algún colaborador queda con saldo pendiente).
 *
 * p_hoy NUNCA lo manda el cliente: se deja su default de Postgres
 * (now() at time zone 'America/Bogota', ver ADR 0006) — mandarlo desde
 * aquí reintroduciría exactamente el bug de zona horaria que esa
 * migración corrigió.
 *
 * @param {{ inicio: string, fin: string }} periodo
 * @param {number} usuarioId quién liquida (p_usuario_id, y lo lee registrar_auditoria())
 * @returns {Promise<object>} la liquidación creada, con el detalle por colaborador
 * @throws {SolicitudInvalida} si el periodo no es una quincena real
 * @throws {Conflicto} si la quincena aún no terminó, ya fue liquidada, existe una liquidación de un periodo posterior, hay órdenes abiertas, o algún colaborador tiene préstamos por encima de su comisión
 */
const liquidarQuincena = async ({ inicio, fin }, usuarioId) => {
  const { data: liquidacionId, error } = await crearClienteConUsuario(usuarioId).rpc(
    'liquidar_quincena',
    { p_inicio: inicio, p_fin: fin, p_usuario_id: usuarioId },
  );

  if (error) {
    throw traducirErrorLiquidarQuincena(error);
  }

  return obtenerLiquidacionOFallar(liquidacionId);
};

/**
 * Lista el historial de liquidaciones, paginado (mismo criterio que
 * listarPagos en credito.service.js y listarUsuarios).
 * @param {{ pagina?: number, porPagina?: number }} [filtros]
 * @returns {Promise<{ liquidaciones: object[], total: number, pagina: number, porPagina: number, totalPaginas: number }>}
 */
const listarLiquidaciones = async ({
  pagina = 1,
  porPagina = POR_PAGINA_DEFECTO_LIQUIDACIONES,
} = {}) => {
  const porPaginaEfectivo = Math.min(porPagina, POR_PAGINA_MAXIMO_LIQUIDACIONES);
  const desde = (pagina - 1) * porPaginaEfectivo;
  const hasta = desde + porPaginaEfectivo - 1;

  const { data, count, error } = await supabase
    .from('liquidaciones_nomina')
    .select(COLUMNAS_LIQUIDACION, { count: 'exact' })
    .order('periodo_inicio', { ascending: false })
    .range(desde, hasta);

  if (error) {
    throw new Error(`No se pudo listar las liquidaciones: ${error.message}`);
  }

  return {
    liquidaciones: aCamelCase(data),
    total: count,
    pagina,
    porPagina: porPaginaEfectivo,
    totalPaginas: Math.max(1, Math.ceil(count / porPaginaEfectivo)),
  };
};

/**
 * Obtiene una liquidación por id, con su detalle por colaborador.
 * @param {number|string} id
 * @returns {Promise<object | null>}
 */
const obtenerLiquidacionPorId = async (id) => {
  const { data, error } = await supabase
    .from('liquidaciones_nomina')
    .select(COLUMNAS_LIQUIDACION)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo obtener la liquidación: ${error.message}`);
  }

  return data ? aCamelCase(data) : null;
};

/**
 * Obtiene una liquidación por id, o lanza NoEncontrado (404).
 * @param {number|string} id
 * @returns {Promise<object>}
 * @throws {NoEncontrado}
 */
const obtenerLiquidacionOFallar = async (id) => {
  const liquidacion = await obtenerLiquidacionPorId(id);
  if (!liquidacion) {
    throw new NoEncontrado('Liquidación no encontrada');
  }
  return liquidacion;
};

module.exports = {
  obtenerResumenQuincena,
  listarDescuentosDeColaborador,
  obtenerDescuentoPorId,
  obtenerDescuentoOFallar,
  registrarDescuento,
  liquidarQuincena,
  listarLiquidaciones,
  obtenerLiquidacionPorId,
  obtenerLiquidacionOFallar,
};
