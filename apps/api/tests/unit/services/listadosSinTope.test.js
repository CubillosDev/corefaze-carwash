/**
 * Los listados que usa la app móvil ya no se truncan en las 1.000 filas de
 * max_rows (ADR 0011). El Supabase local no tiene tantas filas, así que
 * aquí se simula un PostgREST que corta cada respuesta en 1.000 filas y se
 * comprueba que el service pide todas las páginas, con sus filtros.
 */
const TOPE_POSTGREST = 1000;

const mockEstado = { filasPorTabla: {}, consultas: [], rpc: {} };

/** Consulta encadenable: guarda los filtros y responde por rangos, con el tope. */
const mockCrearConsulta = (tabla) => {
  const registro = { tabla, filtros: [], rangos: [] };
  mockEstado.consultas.push(registro);

  const consulta = {
    select: () => consulta,
    order: () => consulta,
    eq: (columna, valor) => {
      registro.filtros.push(['eq', columna, valor]);
      return consulta;
    },
    in: (columna, valores) => {
      registro.filtros.push(['in', columna, valores]);
      return consulta;
    },
    range: (desde, hasta) => {
      registro.rangos.push([desde, hasta]);
      if (mockEstado.fallarEn === tabla) {
        return Promise.resolve({ data: null, error: { message: 'caída simulada' } });
      }
      const filas = mockEstado.filasPorTabla[tabla] ?? [];
      const ultima = Math.min(hasta, desde + TOPE_POSTGREST - 1);
      return Promise.resolve({ data: filas.slice(desde, ultima + 1), error: null });
    },
  };
  return consulta;
};

jest.mock('../../../src/db/supabaseCliente', () => ({
  supabase: {
    from: (tabla) => mockCrearConsulta(tabla),
    rpc: (funcion) => ({
      single: () => Promise.resolve(mockEstado.rpc[funcion]),
    }),
  },
  crearClienteConUsuario: jest.fn(),
}));

const vehiculosService = require('../../../src/services/vehiculos.service');
const clientesService = require('../../../src/services/clientes.service');
const colaboradoresService = require('../../../src/services/colaboradores.service');
const serviciosService = require('../../../src/services/servicios.service');
const ordenesLavadoService = require('../../../src/services/ordenesLavado.service');

const MAS_DEL_TOPE = 2500;
const generarFilas = (cantidad, crear) => Array.from({ length: cantidad }, (_, i) => crear(i + 1));

beforeEach(() => {
  mockEstado.consultas = [];
  mockEstado.fallarEn = null;
  mockEstado.filasPorTabla = {
    vehiculos: generarFilas(MAS_DEL_TOPE, (id) => ({ id, placa: `AAA${id}`, cliente_id: 1 })),
    clientes: generarFilas(MAS_DEL_TOPE, (id) => ({ id, nombre: `Cliente ${id}` })),
    colaboradores: generarFilas(MAS_DEL_TOPE, (id) => ({ id, estado: 'activo' })),
    servicios: generarFilas(MAS_DEL_TOPE, (id) => ({ id, activo: true, tarifas: [] })),
    ordenes_lavado: generarFilas(MAS_DEL_TOPE, (id) => ({
      id,
      jornada_id: 1 + (id % 2),
      valor: 1000,
      estado: id % 10 === 0 ? 'cancelada' : 'entregada',
      medio_pago: 'efectivo',
    })),
  };
});

const consultaDe = (tabla) => mockEstado.consultas.find((consulta) => consulta.tabla === tabla);

/** Cada página es una consulta nueva: los rangos pedidos, en orden, de todas las de la tabla. */
const rangosDe = (tabla) =>
  mockEstado.consultas
    .filter((consulta) => consulta.tabla === tabla)
    .flatMap((consulta) => consulta.rangos);

describe('listados sin el tope de 1.000 filas de PostgREST', () => {
  it.each([
    ['vehiculos', () => vehiculosService.listarVehiculos()],
    ['clientes', () => clientesService.listarClientes()],
    ['colaboradores', () => colaboradoresService.listarColaboradores()],
    ['servicios', () => serviciosService.listarServicios()],
    ['ordenes_lavado', () => ordenesLavadoService.listarOrdenes()],
  ])('%s: sin filtros trae más de 1.000 filas, página por página', async (tabla, listar) => {
    const filas = await listar();

    expect(filas).toHaveLength(MAS_DEL_TOPE);
    expect(filas[MAS_DEL_TOPE - 1].id).toBe(MAS_DEL_TOPE);
    expect(rangosDe(tabla)).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('obtenerTotalesPorJornada suma también las órdenes después de la fila 1.000', async () => {
    const totales = await ordenesLavadoService.obtenerTotalesPorJornada([1, 2]);

    // 2.500 órdenes: las de id par en la jornada 1 (1.250, de las que las 250
    // múltiplos de 10 están canceladas) y las de id impar en la 2 (1.250).
    expect(totales.get(1)).toEqual({ unidades: 1000, ventaTotal: 1000000 });
    expect(totales.get(2)).toEqual({ unidades: 1250, ventaTotal: 1250000 });
    expect(rangosDe('ordenes_lavado')).toHaveLength(3);
  });

  it('listarOrdenes aplica vehiculoId y varias fases en cada página', async () => {
    await ordenesLavadoService.listarOrdenes({
      vehiculoId: 7,
      estados: ['registrada', 'en_proceso'],
    });

    const consulta = consultaDe('ordenes_lavado');
    expect(consulta.filtros).toEqual(
      expect.arrayContaining([
        ['eq', 'vehiculo_id', 7],
        ['in', 'estado', ['registrada', 'en_proceso']],
      ]),
    );
  });

  it('cada listado aplica sus filtros nuevos', async () => {
    await vehiculosService.listarVehiculos({ placa: 'ABC123' });
    await clientesService.listarClientes({
      estado: 'activo',
      tipo: 'empresa',
      documento: '900123',
    });
    await colaboradoresService.listarColaboradores({ estado: 'activo' });
    await serviciosService.listarServicios({ activo: true });

    expect(consultaDe('vehiculos').filtros).toEqual([['eq', 'placa', 'ABC123']]);
    expect(consultaDe('clientes').filtros).toEqual([
      ['eq', 'estado', 'activo'],
      ['eq', 'tipo', 'empresa'],
      ['eq', 'documento', '900123'],
    ]);
    expect(consultaDe('colaboradores').filtros).toEqual([['eq', 'estado', 'activo']]);
    expect(consultaDe('servicios').filtros).toEqual([['eq', 'activo', true]]);
  });

  it('si PostgREST falla en una página, el listado lanza el mismo mensaje de siempre', async () => {
    mockEstado.fallarEn = 'vehiculos';

    await expect(vehiculosService.listarVehiculos()).rejects.toThrow(
      'No se pudo listar vehiculos: caída simulada',
    );
  });
});

describe('historial y conteos calculados en SQL', () => {
  it('obtenerHistorialVehiculo convierte la fila de historial_vehiculo()', async () => {
    mockEstado.rpc.historial_vehiculo = {
      data: {
        visitas: 4,
        ultimo_servicio_id: 3,
        ultimo_servicio_nombre: 'Lavado general',
        ultima_fecha: '2026-11-20',
        servicio_habitual_id: 2,
      },
      error: null,
    };

    await expect(vehiculosService.obtenerHistorialVehiculo(10)).resolves.toEqual({
      visitas: 4,
      ultimoServicio: { id: 3, nombre: 'Lavado general' },
      ultimaFecha: '2026-11-20',
      servicioHabitualId: 2,
    });
  });

  it('obtenerHistorialVehiculo deja ultimoServicio en null si no hay órdenes', async () => {
    mockEstado.rpc.historial_vehiculo = {
      data: {
        visitas: 0,
        ultimo_servicio_id: null,
        ultimo_servicio_nombre: null,
        ultima_fecha: null,
        servicio_habitual_id: null,
      },
      error: null,
    };

    await expect(vehiculosService.obtenerHistorialVehiculo(10)).resolves.toEqual({
      visitas: 0,
      ultimoServicio: null,
      ultimaFecha: null,
      servicioHabitualId: null,
    });
  });

  it('contarOrdenesPorEstado pasa las fases a camelCase', async () => {
    mockEstado.rpc.conteo_ordenes_por_estado = {
      data: { registrada: 1, en_proceso: 2, terminada: 3, entregada: 4, cancelada: 5 },
      error: null,
    };

    await expect(ordenesLavadoService.contarOrdenesPorEstado(1)).resolves.toEqual({
      registrada: 1,
      enProceso: 2,
      terminada: 3,
      entregada: 4,
      cancelada: 5,
    });
  });

  it('un error de la función SQL llega como Error con mensaje en español', async () => {
    mockEstado.rpc.historial_vehiculo = { data: null, error: { message: 'boom' } };
    mockEstado.rpc.conteo_ordenes_por_estado = { data: null, error: { message: 'boom' } };

    await expect(vehiculosService.obtenerHistorialVehiculo(1)).rejects.toThrow(
      'No se pudo calcular el historial del vehículo: boom',
    );
    await expect(ordenesLavadoService.contarOrdenesPorEstado(1)).rejects.toThrow(
      'No se pudo contar las órdenes de la jornada: boom',
    );
  });
});
