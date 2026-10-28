const { supabase } = require('../../../src/db/supabaseCliente');
const { aCamelCase } = require('../../../src/utils/mapearCampos');
const {
  obtenerJornadaAbierta,
  obtenerJornadaPorId,
  obtenerJornadaOFallar,
  listarJornadas,
  abrirJornada,
  cerrarJornada,
  reabrirJornada,
  jornadaEstaAbierta,
} = require('../../../src/services/jornadas.service');
const { NoEncontrado, Conflicto } = require('../../../src/utils/errores');

const USUARIO_ID_PRUEBA = 1;

/** Misma fórmula que usa el service: YYYY-MM-DD en America/Bogota, no en la TZ del sistema de pruebas. */
const obtenerFechaDeHoy = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

const limpiarFecha = async (fecha) => {
  const { data } = await supabase.from('jornadas').select('id').eq('fecha', fecha).maybeSingle();
  if (data) {
    await supabase.from('reaperturas_jornada').delete().eq('jornada_id', data.id);
    await supabase.from('jornadas').delete().eq('id', data.id);
  }
};

// idx_jornadas_una_abierta es GLOBAL (una sola jornada abierta en todo el
// sistema, sin importar su fecha): una jornada que quedó abierta en OTRO
// archivo de pruebas (con una fecha aleatoria cualquiera) bloquearía
// abrir la de hoy aquí. Por eso cada prueba también cierra cualquier
// jornada abierta que encuentre, además de borrar la de hoy (única para
// siempre por jornadas_fecha_key, sin importar el estado).
const limpiarEstadoDeJornadas = async () => {
  const { data: abierta } = await supabase
    .from('jornadas')
    .select('id')
    .eq('estado', 'abierta')
    .maybeSingle();

  if (abierta) {
    await supabase
      .from('jornadas')
      .update({ estado: 'cerrada', cerrada_en: new Date().toISOString() })
      .eq('id', abierta.id);
  }

  await limpiarFecha(obtenerFechaDeHoy());
};

beforeEach(() => limpiarEstadoDeJornadas());

/**
 * Jornada ya cerrada de otra fecha, insertada directo contra la BD (bypass
 * del service: abrirJornada siempre usa la fecha de hoy). La fecha debe
 * ser única para siempre (jornadas_fecha_key): quien llama a esta función
 * es responsable de pasar una que no se repita entre pruebas ni corridas.
 */
const insertarJornadaCerradaDeOtraFecha = async (fecha) => {
  const { data, error } = await supabase
    .from('jornadas')
    .insert({ fecha, estado: 'cerrada', cerrada_en: new Date().toISOString() })
    .select('id, fecha, estado, abierta_en, abierta_por, cerrada_en, cerrada_por')
    .single();

  if (error) {
    throw error;
  }

  return { ...aCamelCase(data), reaperturas: [] };
};

describe('jornadas.service', () => {
  describe('abrirJornada', () => {
    it('abre la primera jornada con la fecha de hoy y estado abierta', async () => {
      const jornada = await abrirJornada();

      expect(jornada).toMatchObject({ fecha: obtenerFechaDeHoy(), estado: 'abierta' });
      expect(typeof jornada.id).toBe('number');
      expect(jornada.abiertaPor).toBeNull();
      expect(jornada.cerradaEn).toBeNull();
      expect(jornada.cerradaPor).toBeNull();
      expect(jornada.reaperturas).toEqual([]);
    });

    it('rechaza abrir si ya existe una jornada abierta (409)', async () => {
      await abrirJornada();
      await expect(abrirJornada()).rejects.toThrow(Conflicto);
    });

    it('rechaza abrir si ya existe una jornada registrada para hoy, aunque esté cerrada (409)', async () => {
      const primera = await abrirJornada();
      await cerrarJornada(primera.id, USUARIO_ID_PRUEBA);

      await expect(abrirJornada()).rejects.toThrow(Conflicto);
    });
  });

  describe('fecha de la jornada: zona horaria America/Bogota', () => {
    const TZ_ORIGINAL = process.env.TZ;
    const FECHA_FALSEADA = '2026-03-15';

    beforeEach(() => limpiarFecha(FECHA_FALSEADA));

    afterEach(async () => {
      process.env.TZ = TZ_ORIGINAL;
      jest.useRealTimers();
      await limpiarFecha(FECHA_FALSEADA);
    });

    it('usa la fecha de Bogotá aunque el servidor corra en UTC: 8 p.m. en Bogotá no adelanta la fecha un día', async () => {
      // Las 8 p.m. del 15 de marzo en Bogotá (UTC-5, sin horario de verano)
      // son la 1 a.m. del 16 de marzo en UTC.
      process.env.TZ = 'UTC';
      jest.useFakeTimers().setSystemTime(new Date('2026-03-16T01:00:00.000Z'));

      const jornada = await abrirJornada();

      expect(jornada.fecha).toBe(FECHA_FALSEADA);
    });
  });

  describe('cerrarJornada', () => {
    it('cierra una jornada abierta y fija cerradaEn', async () => {
      const jornada = await abrirJornada();
      const cerrada = await cerrarJornada(jornada.id, USUARIO_ID_PRUEBA);

      expect(cerrada.estado).toBe('cerrada');
      expect(cerrada.cerradaEn).not.toBeNull();
    });

    it('rechaza cerrar una jornada que ya está cerrada (409)', async () => {
      const jornada = await abrirJornada();
      await cerrarJornada(jornada.id, USUARIO_ID_PRUEBA);

      await expect(cerrarJornada(jornada.id, USUARIO_ID_PRUEBA)).rejects.toThrow(Conflicto);
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(cerrarJornada(999999999, USUARIO_ID_PRUEBA)).rejects.toThrow(NoEncontrado);
    });
  });

  describe('reabrirJornada', () => {
    it('reabre una jornada cerrada y registra la reapertura', async () => {
      // No se usa la jornada de "hoy": reabrirJornada() escribe una fila
      // en reaperturas_jornada, y esa tabla es de solo inserción incluso
      // para service_role (ni el backend puede borrarla). Si esta prueba
      // reabriera la de hoy, la dejaría con una reapertura para siempre,
      // bloqueando jornadas_fecha_key para cualquier otra prueba (de este
      // archivo o de cualquier otro) que necesite abrir la de hoy después.
      const fecha = `${1000 + Math.floor(Math.random() * 9000)}-02-01`;
      const jornada = await insertarJornadaCerradaDeOtraFecha(fecha);

      const reabierta = await reabrirJornada(jornada.id, USUARIO_ID_PRUEBA);

      expect(reabierta.estado).toBe('abierta');
      expect(reabierta.reaperturas).toHaveLength(1);
      expect(reabierta.reaperturas[0].en).toBeDefined();
    });

    it('rechaza reabrir una jornada que no está cerrada (409)', async () => {
      const jornada = await abrirJornada();
      await expect(reabrirJornada(jornada.id, USUARIO_ID_PRUEBA)).rejects.toThrow(Conflicto);
    });

    it('rechaza reabrir si ya hay otra jornada abierta (409)', async () => {
      const primera = await abrirJornada();
      await cerrarJornada(primera.id, USUARIO_ID_PRUEBA);

      // La jornada "otra" se inserta cerrada y luego se reabre para
      // simular que ya quedó abierta, sin pasar por abrirJornada (que
      // siempre usaría la fecha de hoy, ya ocupada por "primera").
      const fechaOtraJornada = `${1000 + Math.floor(Math.random() * 9000)}-01-01`;
      const otra = await insertarJornadaCerradaDeOtraFecha(fechaOtraJornada);
      await reabrirJornada(otra.id, USUARIO_ID_PRUEBA);

      await expect(reabrirJornada(primera.id, USUARIO_ID_PRUEBA)).rejects.toThrow(Conflicto);
    });

    it('lanza NoEncontrado si el id no existe', async () => {
      await expect(reabrirJornada(999999999, USUARIO_ID_PRUEBA)).rejects.toThrow(NoEncontrado);
    });
  });

  describe('listarJornadas', () => {
    let fechaA;
    let fechaB;
    let fechaC;

    // Las 3 fechas deben ser únicas para siempre (jornadas_fecha_key): un
    // año aleatorio distinto en cada prueba de este bloque, para no chocar
    // ni entre las pruebas del propio bloque ni con otras corridas.
    beforeEach(async () => {
      const anioBase = 1000 + Math.floor(Math.random() * 9000);
      fechaA = `${anioBase}-01-05`;
      fechaB = `${anioBase}-01-10`;
      fechaC = `${anioBase}-01-15`;
      await insertarJornadaCerradaDeOtraFecha(fechaA);
      await insertarJornadaCerradaDeOtraFecha(fechaB);
      await insertarJornadaCerradaDeOtraFecha(fechaC);
    });

    it('incluye las jornadas creadas cuando no hay filtros', async () => {
      const resultado = await listarJornadas();
      expect(resultado.map((jornada) => jornada.fecha)).toEqual(
        expect.arrayContaining([fechaA, fechaB, fechaC]),
      );
    });

    it('filtra por desde', async () => {
      // Acotado también por "hasta" (a la propia fechaC): un filtro
      // "desde" sin tope superior barrería con cualquier otra fecha
      // futura que haya quedado de otro archivo de pruebas.
      const resultado = await listarJornadas({ desde: fechaB, hasta: fechaC });
      expect(resultado.map((jornada) => jornada.fecha)).toEqual([fechaB, fechaC]);
    });

    it('filtra por hasta', async () => {
      // Acotado también por "desde" (a la propia fechaA), por la misma
      // razón que el filtro "desde" se acota con "hasta" arriba.
      const resultado = await listarJornadas({ desde: fechaA, hasta: fechaB });
      expect(resultado.map((jornada) => jornada.fecha)).toEqual([fechaA, fechaB]);
    });

    it('filtra por desde y hasta combinados', async () => {
      const anioBase = fechaA.slice(0, 4);
      const resultado = await listarJornadas({
        desde: `${anioBase}-01-06`,
        hasta: `${anioBase}-01-12`,
      });
      expect(resultado.map((jornada) => jornada.fecha)).toEqual([fechaB]);
    });
  });

  describe('obtenerJornadaAbierta', () => {
    it('devuelve null si no hay ninguna jornada abierta', async () => {
      await expect(obtenerJornadaAbierta()).resolves.toBeNull();
    });

    it('devuelve la jornada abierta', async () => {
      const jornada = await abrirJornada();
      await expect(obtenerJornadaAbierta()).resolves.toEqual(jornada);
    });
  });

  describe('obtenerJornadaPorId / obtenerJornadaOFallar', () => {
    it('obtenerJornadaPorId devuelve null si el id no existe', async () => {
      await expect(obtenerJornadaPorId(999999999)).resolves.toBeNull();
    });

    it('obtenerJornadaOFallar lanza NoEncontrado si el id no existe', async () => {
      await expect(obtenerJornadaOFallar(999999999)).rejects.toThrow(NoEncontrado);
    });
  });

  describe('jornadaEstaAbierta', () => {
    it('devuelve true si la jornada está abierta', async () => {
      const jornada = await abrirJornada();
      await expect(jornadaEstaAbierta(jornada.id)).resolves.toBe(true);
    });

    it('devuelve false si la jornada está cerrada', async () => {
      const jornada = await abrirJornada();
      await cerrarJornada(jornada.id, USUARIO_ID_PRUEBA);
      await expect(jornadaEstaAbierta(jornada.id)).resolves.toBe(false);
    });

    it('devuelve false si el id no existe', async () => {
      await expect(jornadaEstaAbierta(999999999)).resolves.toBe(false);
    });
  });
});
