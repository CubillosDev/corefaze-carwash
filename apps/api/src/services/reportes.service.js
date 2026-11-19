const { supabase } = require('../db/supabaseCliente');
const { aCamelCase } = require('../utils/mapearCampos');
const {
  fechaDeHoyEnBogota,
  sumarDias,
  diasDelRango,
  fechasDelRango,
} = require('../utils/fechaNegocio');

const ejecutar = async (funcion, parametros) => {
  const { data, error } = await supabase.rpc(funcion, parametros);
  if (error) {
    throw new Error(`No se pudo calcular el reporte (${funcion}): ${error.message}`);
  }
  return aCamelCase(data ?? []);
};

/** Los bigint de Postgres pueden llegar como texto: siempre se entregan como número. */
const comoNumero = (valor) => Number(valor ?? 0);

const totalesDe = (dias) => {
  const ingresos = dias.reduce((total, dia) => total + dia.ingresos, 0);
  const servicios = dias.reduce((total, dia) => total + dia.servicios, 0);
  return { ingresos, servicios, ticketPromedio: servicios ? Math.round(ingresos / servicios) : 0 };
};

const ventasPorDia = async (desde, hasta) => {
  const filas = await ejecutar('reporte_ventas_por_dia', { p_desde: desde, p_hasta: hasta });
  const porFecha = new Map(filas.map((fila) => [fila.fecha, fila]));
  // Los días sin ventas también se muestran (en cero), para que las barras
  // del periodo queden completas.
  return fechasDelRango(desde, hasta).map((fecha) => ({
    fecha,
    servicios: porFecha.get(fecha)?.servicios ?? 0,
    ingresos: comoNumero(porFecha.get(fecha)?.ingresos),
  }));
};

/**
 * Reporte de un periodo: ingresos y servicios por día, el mix de servicios
 * y el desempeño por colaborador, más los totales del periodo anterior de
 * la misma duración para comparar. Todo sale de funciones SQL (sin el
 * límite de 1.000 filas) y sin canceladas.
 *
 * @param {{ desde: string, hasta: string }} periodo YYYY-MM-DD
 */
const obtenerResumen = async ({ desde, hasta }) => {
  const duracion = diasDelRango(desde, hasta);
  const anteriorHasta = sumarDias(desde, -1);
  const anteriorDesde = sumarDias(desde, -duracion);

  const [dias, diasAnteriores, servicios, colaboradores] = await Promise.all([
    ventasPorDia(desde, hasta),
    ventasPorDia(anteriorDesde, anteriorHasta),
    ejecutar('reporte_mix_servicios', { p_desde: desde, p_hasta: hasta }),
    ejecutar('reporte_colaboradores', { p_desde: desde, p_hasta: hasta }),
  ]);

  return {
    periodo: { desde, hasta, dias: duracion },
    totales: totalesDe(dias),
    anterior: { desde: anteriorDesde, hasta: anteriorHasta, ...totalesDe(diasAnteriores) },
    porDia: dias,
    servicios: servicios.map((fila) => ({ ...fila, ingresos: comoNumero(fila.ingresos) })),
    colaboradores: colaboradores.map((fila) => ({
      ...fila,
      ingresos: comoNumero(fila.ingresos),
      comision: comoNumero(fila.comision),
    })),
  };
};

const horasDe = async (fecha) => {
  const filas = await ejecutar('reporte_ingresos_por_hora', { p_fecha: fecha });
  return filas.map((fila) => ({
    hora: fila.hora,
    servicios: fila.servicios,
    ingresos: comoNumero(fila.ingresos),
  }));
};

const jornadaAnterior = async (fecha) => {
  const { data, error } = await supabase
    .from('jornadas')
    .select('fecha')
    .lt('fecha', fecha)
    .order('fecha', { ascending: false })
    .limit(1);
  if (error) {
    throw new Error(`No se pudo consultar la jornada anterior: ${error.message}`);
  }
  return data[0]?.fecha ?? null;
};

/**
 * Ingresos por hora de una fecha (por defecto, hoy en Bogotá) y de la
 * jornada anterior, para la curva de ingresos acumulados del tablero.
 *
 * @param {{ fecha?: string }} [filtros]
 */
const obtenerIngresosPorHora = async ({ fecha = fechaDeHoyEnBogota() } = {}) => {
  const fechaAnterior = await jornadaAnterior(fecha);
  const [horas, horasAnteriores] = await Promise.all([
    horasDe(fecha),
    fechaAnterior ? horasDe(fechaAnterior) : [],
  ]);

  return {
    fecha,
    horas,
    total: horas.reduce((total, hora) => total + hora.ingresos, 0),
    anterior: fechaAnterior
      ? {
          fecha: fechaAnterior,
          horas: horasAnteriores,
          total: horasAnteriores.reduce((t, h) => t + h.ingresos, 0),
        }
      : null,
  };
};

module.exports = { obtenerResumen, obtenerIngresosPorHora };
