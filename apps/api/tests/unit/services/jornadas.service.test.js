const jornadas = require('../../../src/data/jornadas');
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

beforeEach(() => {
  jornadas.length = 0;
});

/** Misma fórmula que usa el service: YYYY-MM-DD en America/Bogota, no en la TZ del sistema de pruebas. */
const obtenerFechaDeHoy = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

/** Jornada ya cerrada de otra fecha, insertada directo en los datos (abrirJornada siempre usa hoy). */
const insertarJornadaCerradaDeOtraFecha = (id, fecha) => {
  jornadas.push({
    id,
    fecha,
    estado: 'cerrada',
    abiertaEn: new Date().toISOString(),
    abiertaPor: null,
    cerradaEn: new Date().toISOString(),
    cerradaPor: null,
    reaperturas: [],
  });
};

describe('jornadas.service', () => {
  describe('abrirJornada', () => {
    it('abre la primera jornada con la fecha de hoy y estado abierta', () => {
      const jornada = abrirJornada();

      expect(jornada).toMatchObject({ id: 1, fecha: obtenerFechaDeHoy(), estado: 'abierta' });
      expect(jornada.abiertaPor).toBeNull();
      expect(jornada.cerradaEn).toBeNull();
      expect(jornada.cerradaPor).toBeNull();
      expect(jornada.reaperturas).toEqual([]);
    });

    it('rechaza abrir si ya existe una jornada abierta (409)', () => {
      abrirJornada();
      expect(() => abrirJornada()).toThrow(Conflicto);
    });

    it('rechaza abrir si ya existe una jornada registrada para hoy, aunque esté cerrada (409)', () => {
      const primera = abrirJornada();
      cerrarJornada(primera.id);

      expect(() => abrirJornada()).toThrow(Conflicto);
    });
  });

  describe('fecha de la jornada: zona horaria America/Bogota', () => {
    const TZ_ORIGINAL = process.env.TZ;

    afterEach(() => {
      process.env.TZ = TZ_ORIGINAL;
      jest.useRealTimers();
    });

    it('usa la fecha de Bogotá aunque el servidor corra en UTC: 8 p.m. en Bogotá no adelanta la fecha un día', () => {
      // Las 8 p.m. del 15 de marzo en Bogotá (UTC-5, sin horario de verano)
      // son la 1 a.m. del 16 de marzo en UTC.
      process.env.TZ = 'UTC';
      jest.useFakeTimers().setSystemTime(new Date('2026-03-16T01:00:00.000Z'));

      const jornada = abrirJornada();

      expect(jornada.fecha).toBe('2026-03-15');
    });
  });

  describe('cerrarJornada', () => {
    it('cierra una jornada abierta y fija cerradaEn', () => {
      const jornada = abrirJornada();
      const cerrada = cerrarJornada(jornada.id);

      expect(cerrada.estado).toBe('cerrada');
      expect(cerrada.cerradaEn).not.toBeNull();
    });

    it('rechaza cerrar una jornada que ya está cerrada (409)', () => {
      const jornada = abrirJornada();
      cerrarJornada(jornada.id);

      expect(() => cerrarJornada(jornada.id)).toThrow(Conflicto);
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => cerrarJornada(999)).toThrow(NoEncontrado);
    });
  });

  describe('reabrirJornada', () => {
    it('reabre una jornada cerrada y registra la reapertura', () => {
      const jornada = abrirJornada();
      cerrarJornada(jornada.id);

      const reabierta = reabrirJornada(jornada.id);

      expect(reabierta.estado).toBe('abierta');
      expect(reabierta.reaperturas).toHaveLength(1);
      expect(reabierta.reaperturas[0].en).toBeDefined();
    });

    it('rechaza reabrir una jornada que no está cerrada (409)', () => {
      const jornada = abrirJornada();
      expect(() => reabrirJornada(jornada.id)).toThrow(Conflicto);
    });

    it('rechaza reabrir si ya hay otra jornada abierta (409)', () => {
      const primera = abrirJornada();
      cerrarJornada(primera.id);
      insertarJornadaCerradaDeOtraFecha(2, '2000-01-01');
      // La jornada 2 se inserta cerrada y luego se reabre para simular que
      // "otra" jornada quedó abierta, sin pasar por abrirJornada (que
      // siempre usaría la fecha de hoy, ya ocupada por la jornada 1).
      reabrirJornada(2);

      expect(() => reabrirJornada(primera.id)).toThrow(Conflicto);
    });

    it('lanza NoEncontrado si el id no existe', () => {
      expect(() => reabrirJornada(999)).toThrow(NoEncontrado);
    });
  });

  describe('listarJornadas', () => {
    beforeEach(() => {
      insertarJornadaCerradaDeOtraFecha(1, '2026-01-05');
      insertarJornadaCerradaDeOtraFecha(2, '2026-01-10');
      insertarJornadaCerradaDeOtraFecha(3, '2026-01-15');
    });

    it('devuelve todas si no hay filtros', () => {
      expect(listarJornadas()).toHaveLength(3);
    });

    it('filtra por desde', () => {
      const resultado = listarJornadas({ desde: '2026-01-10' });
      expect(resultado.map((jornada) => jornada.fecha)).toEqual(['2026-01-10', '2026-01-15']);
    });

    it('filtra por hasta', () => {
      const resultado = listarJornadas({ hasta: '2026-01-10' });
      expect(resultado.map((jornada) => jornada.fecha)).toEqual(['2026-01-05', '2026-01-10']);
    });

    it('filtra por desde y hasta combinados', () => {
      const resultado = listarJornadas({ desde: '2026-01-06', hasta: '2026-01-12' });
      expect(resultado.map((jornada) => jornada.fecha)).toEqual(['2026-01-10']);
    });
  });

  describe('obtenerJornadaAbierta', () => {
    it('devuelve null si no hay ninguna jornada abierta', () => {
      expect(obtenerJornadaAbierta()).toBeNull();
    });

    it('devuelve la jornada abierta', () => {
      const jornada = abrirJornada();
      expect(obtenerJornadaAbierta()).toEqual(jornada);
    });
  });

  describe('obtenerJornadaPorId / obtenerJornadaOFallar', () => {
    it('obtenerJornadaPorId devuelve null si el id no existe', () => {
      expect(obtenerJornadaPorId(999)).toBeNull();
    });

    it('obtenerJornadaOFallar lanza NoEncontrado si el id no existe', () => {
      expect(() => obtenerJornadaOFallar(999)).toThrow(NoEncontrado);
    });
  });

  describe('jornadaEstaAbierta', () => {
    it('devuelve true si la jornada está abierta', () => {
      const jornada = abrirJornada();
      expect(jornadaEstaAbierta(jornada.id)).toBe(true);
    });

    it('devuelve false si la jornada está cerrada', () => {
      const jornada = abrirJornada();
      cerrarJornada(jornada.id);
      expect(jornadaEstaAbierta(jornada.id)).toBe(false);
    });

    it('devuelve false si el id no existe', () => {
      expect(jornadaEstaAbierta(999)).toBe(false);
    });
  });
});
