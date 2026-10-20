const request = require('supertest');
const { crearApp } = require('../../src/app');
const { generarToken } = require('../../src/utils/jwt.util');
const jornadas = require('../../src/data/jornadas');
const clientes = require('../../src/data/clientes');
const vehiculos = require('../../src/data/vehiculos');
const colaboradores = require('../../src/data/colaboradores');
const servicios = require('../../src/data/servicios');
const ordenesLavado = require('../../src/data/ordenesLavado');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

beforeEach(() => {
  jornadas.length = 0;
  clientes.length = 0;
  vehiculos.length = 0;
  colaboradores.length = 0;
  servicios.length = 0;
  ordenesLavado.length = 0;
});

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

// RBAC (Bloque 6): /api/colaboradores ya exige JWT con rol autorizado; este
// token de prueba se usa SOLO para crear el colaborador que necesitan los
// fixtures de este archivo, no es parte de lo que se está probando aquí.
const TOKEN_ADMINISTRADOR_DE_PRUEBA = generarToken({
  id: 1,
  email: 'administrador@lavadero.com',
  rol: 'administrador',
});

const abrirJornada = () => conApiKey('post', '/api/jornadas');
const cerrarJornada = (id) =>
  conApiKey('patch', `/api/jornadas/${id}/estado`).send({ estado: 'cerrada' });
const reabrirJornada = (id) =>
  conApiKey('patch', `/api/jornadas/${id}/estado`).send({ estado: 'abierta' });

// --- Helpers mínimos para probar los agregados de SCRUM-38 ---

let contadorDocumentoCliente = 0;

const registrarVehiculoDePrueba = async (overrides = {}) => {
  contadorDocumentoCliente += 1;
  const cliente = await conApiKey('post', '/api/clientes').send({
    nombre: 'Ana María Torres',
    documento: `101010${String(contadorDocumentoCliente).padStart(4, '0')}`,
    tipo: 'particular',
    telefono: '3001234567',
  });
  const vehiculo = await conApiKey('post', '/api/vehiculos').send({
    placa: 'ABC123',
    tipoVehiculo: 'automovil',
    clienteId: cliente.body.cliente.id,
    ...overrides,
  });
  return vehiculo.body.vehiculo;
};

const registrarColaboradorDePrueba = async (overrides = {}) => {
  const respuesta = await conApiKey('post', '/api/colaboradores')
    .set('Authorization', `Bearer ${TOKEN_ADMINISTRADOR_DE_PRUEBA}`)
    .send({
      codigo: 401,
      nombre: 'Juan Pérez',
      documento: '1020304050',
      telefono: '3001234567',
      porcentajeComision: 0.15,
      tipoVinculacion: 'fijo',
      ...overrides,
    });
  return respuesta.body.colaborador;
};

const registrarServicioDePrueba = async (overrides = {}) => {
  const respuesta = await conApiKey('post', '/api/servicios').send({
    numero: 1,
    nombre: 'Lavado básico',
    descripcion: 'Lavado exterior con shampoo',
    categoria: 'basico',
    tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
    ...overrides,
  });
  return respuesta.body.servicio;
};

const crearOrdenDePrueba = async (overrides = {}) => {
  const vehiculo = await registrarVehiculoDePrueba({ placa: overrides.placa ?? 'ABC123' });
  const colaborador = await registrarColaboradorDePrueba(overrides.colaborador);
  const servicio = await registrarServicioDePrueba(overrides.servicio);

  const respuesta = await conApiKey('post', '/api/ordenes-lavado').send({
    turno: overrides.turno ?? 1,
    vehiculoId: vehiculo.id,
    servicioId: servicio.id,
    colaboradorId: colaborador.id,
    medioPago: 'efectivo',
  });
  return respuesta.body.orden;
};

describe('POST /api/jornadas', () => {
  it('abre la primera jornada (201)', async () => {
    const respuesta = await abrirJornada();

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.jornada.estado).toBe('abierta');
    expect(respuesta.body.jornada.abiertaPor).toBeNull();
  });

  it('rechaza abrir una segunda jornada mientras la primera sigue abierta (409)', async () => {
    await abrirJornada();

    const respuesta = await abrirJornada();
    expect(respuesta.status).toBe(409);
  });

  it('rechaza abrir si ya existe una jornada para hoy, aunque esté cerrada (409)', async () => {
    const primera = await abrirJornada();
    await cerrarJornada(primera.body.jornada.id);

    const respuesta = await abrirJornada();
    expect(respuesta.status).toBe(409);
  });

  it('requiere API Key', async () => {
    const respuesta = await request(app).post('/api/jornadas');
    expect(respuesta.status).toBe(401);
  });
});

describe('GET /api/jornadas', () => {
  it('lista las jornadas creadas', async () => {
    await abrirJornada();

    const respuesta = await conApiKey('get', '/api/jornadas');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.jornadas).toHaveLength(1);
  });

  it('rechaza un filtro desde con formato inválido (400)', async () => {
    const respuesta = await conApiKey('get', '/api/jornadas?desde=no-es-fecha');
    expect(respuesta.status).toBe(400);
  });

  it('SCRUM-38: incluye unidades, ventaTotal (agregados de sus propias órdenes) y diferenciaCaja en null', async () => {
    const jornadaAbierta = await abrirJornada();
    const jornadaId = jornadaAbierta.body.jornada.id;

    await crearOrdenDePrueba({
      turno: 1,
      placa: 'ABC123',
      colaborador: { codigo: 401, documento: '1020304050' },
      servicio: { numero: 1 },
    });
    await crearOrdenDePrueba({
      turno: 2,
      placa: 'XYZ789',
      colaborador: { codigo: 402, documento: '1020304099' },
      servicio: { numero: 2 },
    });

    await cerrarJornada(jornadaId);

    const respuesta = await conApiKey('get', '/api/jornadas');

    expect(respuesta.status).toBe(200);
    const jornadaEnRespuesta = respuesta.body.jornadas.find((j) => j.id === jornadaId);
    expect(jornadaEnRespuesta.unidades).toBe(2);
    expect(jornadaEnRespuesta.ventaTotal).toBe(30000);
    expect(jornadaEnRespuesta.diferenciaCaja).toBeNull();
  });
});

describe('GET /api/jornadas/:id', () => {
  it('devuelve la jornada encontrada (200)', async () => {
    const creada = await abrirJornada();

    const respuesta = await conApiKey('get', `/api/jornadas/${creada.body.jornada.id}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.jornada.id).toBe(creada.body.jornada.id);
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conApiKey('get', '/api/jornadas/9999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conApiKey('get', '/api/jornadas/abc');
    expect(respuesta.status).toBe(400);
  });
});

describe('PATCH /api/jornadas/:id/estado', () => {
  it('estado "cerrada": cierra la jornada abierta (200)', async () => {
    const creada = await abrirJornada();

    const respuesta = await cerrarJornada(creada.body.jornada.id);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.jornada.estado).toBe('cerrada');
  });

  it('rechaza cerrar una jornada que ya está cerrada (409)', async () => {
    const creada = await abrirJornada();
    await cerrarJornada(creada.body.jornada.id);

    const respuesta = await cerrarJornada(creada.body.jornada.id);
    expect(respuesta.status).toBe(409);
  });

  it('id inexistente al cerrar: 404', async () => {
    const respuesta = await cerrarJornada(9999);
    expect(respuesta.status).toBe(404);
  });

  it('estado "abierta": reabre la jornada cerrada (200) y registra la reapertura', async () => {
    const creada = await abrirJornada();
    await cerrarJornada(creada.body.jornada.id);

    const respuesta = await reabrirJornada(creada.body.jornada.id);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.jornada.estado).toBe('abierta');
    expect(respuesta.body.jornada.reaperturas).toHaveLength(1);
  });

  it('rechaza reabrir una jornada que no está cerrada (409)', async () => {
    const creada = await abrirJornada();

    const respuesta = await reabrirJornada(creada.body.jornada.id);
    expect(respuesta.status).toBe(409);
  });

  it('id inexistente al reabrir: 404', async () => {
    const respuesta = await reabrirJornada(9999);
    expect(respuesta.status).toBe(404);
  });

  it('rechaza un estado que no existe en el dominio (400)', async () => {
    const creada = await abrirJornada();

    const respuesta = await conApiKey(
      'patch',
      `/api/jornadas/${creada.body.jornada.id}/estado`,
    ).send({ estado: 'pausada' });
    expect(respuesta.status).toBe(400);
  });
});
