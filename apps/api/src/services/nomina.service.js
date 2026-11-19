const { supabase, crearClienteConUsuario } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const { Conflicto, NoEncontrado, SolicitudInvalida } = require('../utils/errores');
const { crearTraductorErroresPostgres } = require('../utils/traducirErrorPostgres');
const { fechaDeHoyEnBogota } = require('../utils/fechaNegocio');

const COLUMNAS_LIQUIDACION =
  'id, periodo_inicio, periodo_fin, total_comision, total_descuentos, total_neto, liquidado_por, liquidado_en';
const COLUMNAS_DESCUENTO =
  'id, colaborador_id, fecha, tipo, valor, observacion, registrado_por, liquidacion_id, creado_en, ' +
  'colaborador:colaboradores(codigo, nombre)';

/**
 * registrar_descuento() y liquidar_quincena() (ADR 0006) redactan sus
 * reglas en español: se reenvían tal cual como 409. Un CHECK de tabla que
 * se escape de los validadores es 400.
 */
const traducirErrorPostgres = crearTraductorErroresPostgres({
  tabla: 'descuentos_colaborador',
  etiqueta: 'nómina',
  mapeo: {
    23505: () => new Conflicto('Esa quincena ya está liquidada'),
    23514: (error) =>
      error.message.includes('violates check constraint')
        ? new SolicitudInvalida([], 'Datos de nómina inválidos')
        : new Conflicto(error.message),
    23503: () => new NoEncontrado('El colaborador no existe'),
    P0002: (error) => new NoEncontrado(error.message),
  },
});

const consultar = async (consulta, contexto) => {
  const { data, error } = await consulta;
  if (error) {
    throw new Error(`No se pudo consultar ${contexto}: ${error.message}`);
  }
  return aCamelCase(data);
};

/** Quincena (1–15 o 16–fin de mes) a la que pertenece una fecha, según limites_quincena(). */
const quincenaDe = async (fecha) => {
  const { data, error } = await supabase.rpc('limites_quincena', { p_fecha: fecha });
  if (error) {
    throw new Error(`No se pudo calcular la quincena: ${error.message}`);
  }
  return { inicio: data.inicio, fin: data.fin };
};

const sumar = (filas, campo) => filas.reduce((total, fila) => total + Number(fila[campo] ?? 0), 0);

/**
 * Nómina de la quincena que contiene `fecha` (por defecto, hoy en Bogotá):
 * por colaborador, servicios, producido, comisión, descuentos por tipo,
 * neto y saldo pendiente (resumen_nomina_periodo, el mismo cálculo de
 * liquidar_quincena), los descuentos del periodo, la liquidación si ya se
 * hizo y si ya se puede liquidar.
 *
 * @param {{ fecha?: string }} [filtros]
 */
const obtenerQuincena = async ({ fecha = fechaDeHoyEnBogota() } = {}) => {
  const periodo = await quincenaDe(fecha);
  const [colaboradores, descuentos, liquidaciones] = await Promise.all([
    supabase
      .rpc('resumen_nomina_periodo', { p_inicio: periodo.inicio, p_fin: periodo.fin })
      .then(({ data, error }) => {
        if (error) {
          throw new Error(`No se pudo calcular la nómina: ${error.message}`);
        }
        return aCamelCase(data ?? []);
      }),
    consultar(
      supabase
        .from('descuentos_colaborador')
        .select(COLUMNAS_DESCUENTO)
        .gte('fecha', periodo.inicio)
        .lte('fecha', periodo.fin)
        .order('fecha', { ascending: false })
        .order('id', { ascending: false }),
      'los descuentos',
    ),
    consultar(
      supabase
        .from('liquidaciones_nomina')
        .select(COLUMNAS_LIQUIDACION)
        .eq('periodo_inicio', periodo.inicio)
        .limit(1),
      'la liquidación',
    ),
  ]);

  const filas = colaboradores.map((fila) => ({ ...fila, producido: Number(fila.producido) }));
  const liquidacion = liquidaciones[0] ?? null;
  const hoy = fechaDeHoyEnBogota();

  return {
    periodo,
    liquidacion,
    puedeLiquidar: !liquidacion && hoy >= periodo.fin,
    totales: {
      servicios: sumar(filas, 'servicios'),
      producido: sumar(filas, 'producido'),
      comision: sumar(filas, 'comision'),
      descuentos: sumar(filas, 'descuentos'),
      neto: sumar(filas, 'neto'),
      saldoPendiente: sumar(filas, 'saldoPendiente'),
    },
    colaboradores: filas,
    descuentos,
  };
};

/**
 * Registra un descuento (préstamo, jabón o multa) con la fecha de hoy. El
 * préstamo tiene el límite de la comisión disponible; los demás no (ADR 0006).
 */
const registrarDescuento = async (
  { colaboradorId, tipo, valor, observacion = null },
  usuarioId,
) => {
  const { data: id, error } = await crearClienteConUsuario(usuarioId).rpc('registrar_descuento', {
    p_colaborador_id: colaboradorId,
    p_tipo: tipo,
    p_valor: valor,
    p_fecha: fechaDeHoyEnBogota(),
    p_usuario_id: usuarioId,
    p_observacion: observacion,
  });
  if (error) {
    throw traducirErrorPostgres(error);
  }
  return consultar(
    supabase.from('descuentos_colaborador').select(COLUMNAS_DESCUENTO).eq('id', id).single(),
    'el descuento',
  );
};

/** Liquida una quincena ya terminada (todo o nada, ver liquidar_quincena). */
const liquidarQuincena = async ({ inicio, fin }, usuarioId) => {
  const { data: id, error } = await crearClienteConUsuario(usuarioId).rpc('liquidar_quincena', {
    p_inicio: inicio,
    p_fin: fin,
    p_usuario_id: usuarioId,
  });
  if (error) {
    throw traducirErrorPostgres(error);
  }
  return consultar(
    supabase.from('liquidaciones_nomina').select(COLUMNAS_LIQUIDACION).eq('id', id).single(),
    'la liquidación',
  );
};

/** Historial de liquidaciones, de la más reciente a la más antigua. */
const listarLiquidaciones = () =>
  consultar(
    supabase
      .from('liquidaciones_nomina')
      .select(COLUMNAS_LIQUIDACION)
      .order('periodo_inicio', { ascending: false })
      .limit(48),
    'las liquidaciones',
  );

module.exports = { obtenerQuincena, registrarDescuento, liquidarQuincena, listarLiquidaciones };
