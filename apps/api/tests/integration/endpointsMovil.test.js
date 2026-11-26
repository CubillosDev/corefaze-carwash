/**
 * Endpoints y filtros para la recepción en la app móvil (ADR 0011):
 * consulta de placa en una llamada, jornada de hoy con conteo por fase, y
 * filtros opcionales en los listados. Contra el Supabase local, como las
 * demás pruebas de integración.
 */
const {
  supabase,
  conApiKey,
  conRol,
  conToken,
  cerrarJornadaYCajaAbiertas,
  abrirJornada,
  registrarCliente,
  registrarVehiculo,
  obtenerColaborador,
} = require('../utils/escenarioPanel');
const fechaNegocio = require('../../src/utils/fechaNegocio');
const { crearGeneradorDeValorUnico, baseAleatoriaDeServicio } = require('../utils/valorUnico');

const ROLES_QUE_CONSULTAN = ['superadmin', 'administrador', 'soporte'];

const esc = {};
let turno = 0;

// Bloque fijo reservado para este archivo (ARCHIVOS_CON_BLOQUE_DE_SERVICIO
// en valorUnico.js), con un desplazamiento aleatorio que no se sale de él
// (baseAleatoriaDeServicio): el bloque disjunto evita chocar con otro
// archivo aunque corran en secuencia sin `db reset` de por medio
// (.github/workflows/api.yml, causa del PR #42); el desplazamiento evita
// que repetir este archivo sin reset choque con lo que dejó la corrida anterior.
const numeroUnicoServicio = crearGeneradorDeValorUnico(
  baseAleatoriaDeServicio(__filename),
  (sello, contador) => sello + contador,
);

const crearServicio = async (nombre) => {
  const respuesta = await conToken('post', '/api/servicios').send({
    numero: numeroUnicoServicio(),
    nombre,
    descripcion: 'Servicio de prueba de recepción',
    categoria: 'basico',
    tarifas: [{ tipoVehiculo: 'automovil', valor: 20000 }],
  });
  if (respuesta.status !== 201) {
    throw new Error(`No se pudo crear el servicio: ${JSON.stringify(respuesta.body)}`);
  }
  return respuesta.body.servicio;
};

const cambiarEstado = async (ordenId, estado, motivo) => {
  const respuesta = await conToken('patch', `/api/ordenes-lavado/${ordenId}/estado`).send({
    estado,
    ...(motivo ? { motivo } : {}),
  });
  if (respuesta.status !== 200) {
    throw new Error(`No se pudo pasar a ${estado}: ${JSON.stringify(respuesta.body)}`);
  }
};

/** Registra una orden del vehículo y la lleva a la fase pedida por las transiciones válidas. */
const crearOrden = async (vehiculoId, servicioId, estadoFinal) => {
  turno += 1;
  const creada = await conToken('post', '/api/ordenes-lavado').send({
    turno,
    vehiculoId,
    servicioId,
    colaboradorId: esc.colaborador.id,
    medioPago: 'efectivo',
  });
  if (creada.status !== 201) {
    throw new Error(`No se pudo crear la orden: ${JSON.stringify(creada.body)}`);
  }
  const { id } = creada.body.orden;

  if (estadoFinal === 'cancelada') {
    await cambiarEstado(id, 'cancelada', 'Cliente se retiró');
    return id;
  }
  for (const paso of ['en_proceso', 'terminada', 'entregada']) {
    if (estadoFinal === 'registrada') {
      break;
    }
    await cambiarEstado(id, paso);
    if (paso === estadoFinal) {
      break;
    }
  }
  return id;
};

/** Una placa de moto con formato válido que no está registrada. */
const placaNoRegistrada = async () => {
  for (;;) {
    const letras = () =>
      Array.from({ length: 3 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]);
    const placa = `${letras().join('')}${Math.floor(Math.random() * 90) + 10}Z`;
    const { data } = await supabase.from('vehiculos').select('id').eq('placa', placa);
    if (data.length === 0) {
      return placa;
    }
  }
};

beforeAll(async () => {
  await cerrarJornadaYCajaAbiertas();
  esc.fecha = await abrirJornada();
  esc.cliente = await registrarCliente();
  esc.colaborador = await obtenerColaborador();
  esc.servicioUno = await crearServicio('Lavado recepción uno');
  esc.servicioDos = await crearServicio('Lavado recepción dos');

  esc.vehiculo = await registrarVehiculo(esc.cliente.id);
  esc.vehiculoSinOrdenes = await registrarVehiculo(esc.cliente.id);
  esc.vehiculoEnProceso = await registrarVehiculo(esc.cliente.id);
  esc.vehiculoRegistrada = await registrarVehiculo(esc.cliente.id);

  // Empate 2 a 2 entre los dos servicios; el más reciente válido es del
  // servicio dos. La última orden (del uno) se cancela y no cuenta.
  const uno = esc.servicioUno.id;
  const dos = esc.servicioDos.id;
  await crearOrden(esc.vehiculo.id, uno, 'entregada');
  await crearOrden(esc.vehiculo.id, dos, 'entregada');
  await crearOrden(esc.vehiculo.id, uno, 'entregada');
  await crearOrden(esc.vehiculo.id, dos, 'terminada');
  await crearOrden(esc.vehiculo.id, uno, 'cancelada');
  await crearOrden(esc.vehiculoEnProceso.id, uno, 'en_proceso');
  await crearOrden(esc.vehiculoRegistrada.id, uno, 'registrada');
});

afterAll(async () => {
  jest.restoreAllMocks();
  await cerrarJornadaYCajaAbiertas();
});

describe('GET /api/vehiculos/consulta/:placa', () => {
  const ruta = (placa) => `/api/vehiculos/consulta/${placa}`;

  it('placa registrada: vehículo, dueño e historial calculado en SQL', async () => {
    // En minúsculas: se normaliza igual que al registrar.
    const respuesta = await conToken('get', ruta(esc.vehiculo.placa.toLowerCase()));

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      placa: esc.vehiculo.placa,
      registrado: true,
      vehiculo: esc.vehiculo,
      dueno: esc.cliente,
      historial: {
        visitas: 4,
        ultimoServicio: { id: esc.servicioDos.id, nombre: esc.servicioDos.nombre },
        ultimaFecha: esc.fecha,
        servicioHabitualId: esc.servicioDos.id,
      },
    });
  });

  it('placa registrada sin órdenes: historial vacío', async () => {
    const respuesta = await conToken('get', ruta(esc.vehiculoSinOrdenes.placa));

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.registrado).toBe(true);
    expect(respuesta.body.historial).toEqual({
      visitas: 0,
      ultimoServicio: null,
      ultimaFecha: null,
      servicioHabitualId: null,
    });
  });

  it('placa no registrada: 200 con registrado false (no es un error)', async () => {
    const placa = await placaNoRegistrada();
    const respuesta = await conToken('get', ruta(placa.toLowerCase()));

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({
      placa,
      registrado: false,
      vehiculo: null,
      dueno: null,
      historial: { visitas: 0, ultimoServicio: null, ultimaFecha: null, servicioHabitualId: null },
    });
  });

  it.each(['ABC-123', 'ABCD12', '123ABC', 'AB12'])(
    '400 con la placa inválida %s',
    async (placa) => {
      const respuesta = await conToken('get', ruta(placa));

      expect(respuesta.status).toBe(400);
      expect(respuesta.body.errores).toEqual([
        {
          campo: 'placa',
          mensaje: 'La placa debe tener el formato ABC123 (carro) o ABC12D (moto)',
        },
      ]);
    },
  );

  it.each(ROLES_QUE_CONSULTAN)('200 para %s', async (rol) => {
    const respuesta = await conRol(rol, 'get', ruta(esc.vehiculo.placa));
    expect(respuesta.status).toBe(200);
  });

  it('403 para pendiente', async () => {
    const respuesta = await conRol('pendiente', 'get', ruta(esc.vehiculo.placa));
    expect(respuesta.status).toBe(403);
  });

  it('401 sin token', async () => {
    const respuesta = await conApiKey('get', ruta(esc.vehiculo.placa));
    expect(respuesta.status).toBe(401);
  });
});

describe('GET /api/jornadas/actual', () => {
  it('la jornada de hoy con sus órdenes por fase', async () => {
    jest.spyOn(fechaNegocio, 'fechaDeHoyEnBogota').mockReturnValue(esc.fecha);

    const respuesta = await conToken('get', '/api/jornadas/actual');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.fecha).toBe(esc.fecha);
    expect(respuesta.body.jornada).toMatchObject({ fecha: esc.fecha, estado: 'abierta' });
    expect(respuesta.body.jornada.ordenesPorEstado).toEqual({
      registrada: 1,
      enProceso: 1,
      terminada: 1,
      entregada: 3,
      cancelada: 1,
    });
  });

  it('jornada null si hoy no se ha abierto', async () => {
    jest.spyOn(fechaNegocio, 'fechaDeHoyEnBogota').mockReturnValue('2999-12-31');

    const respuesta = await conToken('get', '/api/jornadas/actual');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ fecha: '2999-12-31', jornada: null });
  });

  it.each(ROLES_QUE_CONSULTAN)('200 para %s', async (rol) => {
    const respuesta = await conRol(rol, 'get', '/api/jornadas/actual');
    expect(respuesta.status).toBe(200);
  });

  it('403 para pendiente', async () => {
    const respuesta = await conRol('pendiente', 'get', '/api/jornadas/actual');
    expect(respuesta.status).toBe(403);
  });

  it('401 sin token', async () => {
    const respuesta = await conApiKey('get', '/api/jornadas/actual');
    expect(respuesta.status).toBe(401);
  });
});

describe('filtros nuevos en los listados', () => {
  describe('GET /api/vehiculos?placa=', () => {
    it('devuelve solo el vehículo de la placa exacta (normalizada)', async () => {
      const respuesta = await conToken(
        'get',
        `/api/vehiculos?placa=${esc.vehiculo.placa.toLowerCase()}`,
      );

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ vehiculos: [esc.vehiculo] });
    });

    it('arreglo vacío si la placa no está registrada', async () => {
      const respuesta = await conToken('get', `/api/vehiculos?placa=${await placaNoRegistrada()}`);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ vehiculos: [] });
    });

    it('sin parámetros sigue devolviendo la lista completa', async () => {
      const respuesta = await conToken('get', '/api/vehiculos');

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.vehiculos).toEqual(expect.arrayContaining([esc.vehiculo]));
    });

    it('400 con una placa inválida', async () => {
      const respuesta = await conToken('get', '/api/vehiculos?placa=XX-1');
      expect(respuesta.status).toBe(400);
    });
  });

  describe('GET /api/ordenes-lavado?vehiculoId=&estado=', () => {
    it('vehiculoId: todas las órdenes del vehículo, con los totales de siempre', async () => {
      const respuesta = await conToken('get', `/api/ordenes-lavado?vehiculoId=${esc.vehiculo.id}`);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.ordenes).toHaveLength(5);
      expect(respuesta.body.ordenes.every((o) => o.vehiculoId === esc.vehiculo.id)).toBe(true);
      expect(respuesta.body.totales.cantidadServicios).toBe(4);
    });

    it.each([
      ['separadas por coma', 'estado=entregada,terminada', 4],
      ['repetidas', 'estado=entregada&estado=cancelada', 4],
      ['una sola', 'estado=cancelada', 1],
    ])('estado con varias fases %s', async (_forma, consulta, cantidad) => {
      const respuesta = await conToken(
        'get',
        `/api/ordenes-lavado?vehiculoId=${esc.vehiculo.id}&${consulta}`,
      );

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.ordenes).toHaveLength(cantidad);
    });

    it.each(['estado=pagada', 'estado=', 'vehiculoId=abc', 'vehiculoId=0'])(
      '400 con %s',
      async (consulta) => {
        const respuesta = await conToken('get', `/api/ordenes-lavado?${consulta}`);
        expect(respuesta.status).toBe(400);
      },
    );
  });

  describe('GET /api/clientes?estado=&tipo=&documento=', () => {
    it('documento exacto', async () => {
      const respuesta = await conToken('get', `/api/clientes?documento=${esc.cliente.documento}`);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({ clientes: [esc.cliente] });
    });

    it('estado y tipo se combinan', async () => {
      const respuesta = await conToken('get', '/api/clientes?estado=activo&tipo=particular');

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.clientes).toEqual(expect.arrayContaining([esc.cliente]));
      expect(
        respuesta.body.clientes.every((c) => c.estado === 'activo' && c.tipo === 'particular'),
      ).toBe(true);
    });

    it.each(['estado=borrado', 'tipo=persona', 'documento=12'])('400 con %s', async (consulta) => {
      const respuesta = await conToken('get', `/api/clientes?${consulta}`);
      expect(respuesta.status).toBe(400);
    });
  });

  describe('GET /api/colaboradores?estado=', () => {
    it('solo los activos', async () => {
      const respuesta = await conToken('get', '/api/colaboradores?estado=activo');

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.colaboradores.map((c) => c.id)).toContain(esc.colaborador.id);
      expect(respuesta.body.colaboradores.every((c) => c.estado === 'activo')).toBe(true);
    });

    it('400 con un estado inválido', async () => {
      const respuesta = await conToken('get', '/api/colaboradores?estado=vacaciones');
      expect(respuesta.status).toBe(400);
    });
  });

  describe('GET /api/servicios?activo=', () => {
    it('activo=true: solo los activos, con sus tarifas por tipo de vehículo', async () => {
      const respuesta = await conToken('get', '/api/servicios?activo=true');

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.servicios.every((s) => s.activo === true)).toBe(true);
      const uno = respuesta.body.servicios.find((s) => s.id === esc.servicioUno.id);
      expect(uno.tarifas).toEqual([{ tipoVehiculo: 'automovil', valor: 20000 }]);
    });

    it('activo=false: solo los inactivos', async () => {
      const respuesta = await conToken('get', '/api/servicios?activo=false');

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.servicios.every((s) => s.activo === false)).toBe(true);
    });

    it.each(['activo=si', 'activo=1'])('400 con %s', async (consulta) => {
      const respuesta = await conToken('get', `/api/servicios?${consulta}`);
      expect(respuesta.status).toBe(400);
    });
  });

  describe.each([
    '/api/vehiculos?placa=ABC123',
    '/api/ordenes-lavado?estado=registrada',
    '/api/clientes?estado=activo',
    '/api/colaboradores?estado=activo',
    '/api/servicios?activo=true',
  ])('%s con filtros: mismos permisos de siempre', (ruta) => {
    it.each(ROLES_QUE_CONSULTAN)('200 para %s', async (rol) => {
      expect((await conRol(rol, 'get', ruta)).status).toBe(200);
    });

    it('403 para pendiente', async () => {
      expect((await conRol('pendiente', 'get', ruta)).status).toBe(403);
    });

    it('401 sin token', async () => {
      expect((await conApiKey('get', ruta)).status).toBe(401);
    });
  });
});
