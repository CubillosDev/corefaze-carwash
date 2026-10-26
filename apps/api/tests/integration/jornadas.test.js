const request = require('supertest');
const { crearApp } = require('../../src/app');
const { generarToken } = require('../../src/utils/jwt.util');
const jornadas = require('../../src/data/jornadas');
const colaboradores = require('../../src/data/colaboradores');
const servicios = require('../../src/data/servicios');
const ordenesLavado = require('../../src/data/ordenesLavado');
const usuarios = require('../../src/data/usuarios');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40), web: 'w'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

// RBAC (SCRUM-139): todo el recurso exige API Key + JWT con rol autorizado.
// autenticarJWT ya no toma el rol del payload del token: vuelve a
// consultar al usuario actual (hallazgo de revisión del PR #7), así que
// cada rol de prueba necesita también su propio registro en la "tabla"
// de usuarios, re-sembrado en cada beforeEach.
const ROLES_DE_PRUEBA = ['superadmin', 'administrador', 'soporte', 'pendiente'];
const idDeRolDePrueba = (rol) => ROLES_DE_PRUEBA.indexOf(rol) + 1;
const tokenDe = (rol) =>
  generarToken({ id: idDeRolDePrueba(rol), email: `${rol}@lavadero.com`, rol });
const TOKEN_SUPERADMIN = tokenDe('superadmin');
const TOKEN_ADMINISTRADOR = tokenDe('administrador');
const TOKEN_SOPORTE = tokenDe('soporte');
const TOKEN_PENDIENTE = tokenDe('pendiente');

beforeEach(() => {
  jornadas.length = 0;
  colaboradores.length = 0;
  servicios.length = 0;
  ordenesLavado.length = 0;
  usuarios.length = 0;
  ROLES_DE_PRUEBA.forEach((rol) => {
    usuarios.push({
      id: idDeRolDePrueba(rol),
      nombre: rol,
      email: `${rol}@lavadero.com`,
      passwordHash: 'irrelevante-para-estas-pruebas',
      rol,
      activo: true,
    });
  });
});

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

const conToken = (metodo, ruta, token = TOKEN_ADMINISTRADOR) =>
  conApiKey(metodo, ruta).set('Authorization', `Bearer ${token}`);

const abrirJornada = (token = TOKEN_ADMINISTRADOR) => conToken('post', '/api/jornadas', token);
const cerrarJornada = (id, token = TOKEN_ADMINISTRADOR) =>
  conToken('patch', `/api/jornadas/${id}/estado`, token).send({ estado: 'cerrada' });
const reabrirJornada = (id, token = TOKEN_SUPERADMIN) =>
  conToken('patch', `/api/jornadas/${id}/estado`, token).send({ estado: 'abierta' });

// --- Helpers mínimos para probar los agregados de SCRUM-38 ---

// clientes.service.js ya escribe en el Supabase local (SCRUM-152, Etapa
// A), no en un array que el beforeEach pudiera vaciar: el documento es
// único (salto aleatorio + contador) para no chocar ni dentro de esta
// corrida ni con filas de corridas anteriores sin un `db reset` de por medio.
const selloDocumentoCliente = Math.floor(Math.random() * 1e6)
  .toString()
  .padStart(6, '0');
let contadorDocumentoCliente = 0;

// vehiculos.service.js ya escribe en el Supabase local (SCRUM-152), no en
// un array que el beforeEach pudiera vaciar: la placa es única (letras
// fijas por archivo + contador) para no chocar ni dentro de esta corrida
// ni con otro archivo que Jest ejecute en paralelo.
const LETRAS_PLACA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const letraAleatoriaPlaca = () => LETRAS_PLACA[Math.floor(Math.random() * LETRAS_PLACA.length)];
const prefijoPlaca = `${letraAleatoriaPlaca()}${letraAleatoriaPlaca()}${letraAleatoriaPlaca()}`;
let contadorPlaca = 0;
const siguientePlaca = () => {
  contadorPlaca += 1;
  return `${prefijoPlaca}${String(contadorPlaca).padStart(3, '0')}`;
};

const registrarVehiculoDePrueba = async (overrides = {}) => {
  contadorDocumentoCliente += 1;
  const { placa, ...resto } = overrides;
  const cliente = await conToken('post', '/api/clientes').send({
    nombre: 'Ana María Torres',
    documento: `${selloDocumentoCliente}${String(contadorDocumentoCliente).padStart(3, '0')}`,
    tipo: 'particular',
    telefono: '3001234567',
  });
  const vehiculo = await conToken('post', '/api/vehiculos').send({
    placa: placa ?? siguientePlaca(),
    tipoVehiculo: 'automovil',
    clienteId: cliente.body.cliente.id,
    ...resto,
  });
  return vehiculo.body.vehiculo;
};

const registrarColaboradorDePrueba = async (overrides = {}) => {
  const respuesta = await conToken('post', '/api/colaboradores').send({
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
  const respuesta = await conToken('post', '/api/servicios').send({
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
  const vehiculo = await registrarVehiculoDePrueba({ placa: overrides.placa });
  const colaborador = await registrarColaboradorDePrueba(overrides.colaborador);
  const servicio = await registrarServicioDePrueba(overrides.servicio);

  const respuesta = await conToken('post', '/api/ordenes-lavado').send({
    turno: overrides.turno ?? 1,
    vehiculoId: vehiculo.id,
    servicioId: servicio.id,
    colaboradorId: colaborador.id,
    medioPago: 'efectivo',
  });
  return respuesta.body.orden;
};

describe('POST /api/jornadas', () => {
  it('abre la primera jornada (201) y registra el email del usuario autenticado en abiertaPor', async () => {
    const respuesta = await abrirJornada();

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.jornada.estado).toBe('abierta');
    expect(respuesta.body.jornada.abiertaPor).toBe('administrador@lavadero.com');
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
    const respuesta = await request(app)
      .post('/api/jornadas')
      .set('Authorization', `Bearer ${TOKEN_ADMINISTRADOR}`);
    expect(respuesta.status).toBe(401);
  });

  it('requiere JWT (401 sin Authorization, aunque la API Key sea válida)', async () => {
    const respuesta = await conApiKey('post', '/api/jornadas');
    expect(respuesta.status).toBe(401);
  });

  it('soporte también puede abrir la jornada (201)', async () => {
    const respuesta = await abrirJornada(TOKEN_SOPORTE);
    expect(respuesta.status).toBe(201);
  });

  it('RBAC: un usuario "pendiente" no puede abrir la jornada (403)', async () => {
    const respuesta = await abrirJornada(TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });
});

describe('GET /api/jornadas', () => {
  it('lista las jornadas creadas', async () => {
    await abrirJornada();

    const respuesta = await conToken('get', '/api/jornadas');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.jornadas).toHaveLength(1);
  });

  it('rechaza un filtro desde con formato inválido (400)', async () => {
    const respuesta = await conToken('get', '/api/jornadas?desde=no-es-fecha');
    expect(respuesta.status).toBe(400);
  });

  it('RBAC: un usuario "pendiente" no puede listar (403)', async () => {
    const respuesta = await conToken('get', '/api/jornadas', TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });

  it('requiere JWT (401 sin Authorization)', async () => {
    const respuesta = await conApiKey('get', '/api/jornadas');
    expect(respuesta.status).toBe(401);
  });

  it('SCRUM-38: incluye unidades, ventaTotal (agregados de sus propias órdenes) y diferenciaCaja en null', async () => {
    const jornadaAbierta = await abrirJornada();
    const jornadaId = jornadaAbierta.body.jornada.id;

    await crearOrdenDePrueba({
      turno: 1,
      colaborador: { codigo: 401, documento: '1020304050' },
      servicio: { numero: 1 },
    });
    await crearOrdenDePrueba({
      turno: 2,
      colaborador: { codigo: 402, documento: '1020304099' },
      servicio: { numero: 2 },
    });

    await cerrarJornada(jornadaId);

    const respuesta = await conToken('get', '/api/jornadas');

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

    const respuesta = await conToken('get', `/api/jornadas/${creada.body.jornada.id}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.jornada.id).toBe(creada.body.jornada.id);
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('get', '/api/jornadas/9999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conToken('get', '/api/jornadas/abc');
    expect(respuesta.status).toBe(400);
  });
});

describe('PATCH /api/jornadas/:id/estado', () => {
  it('estado "cerrada": cierra la jornada abierta (200) y registra el email en cerradaPor', async () => {
    const creada = await abrirJornada();

    const respuesta = await cerrarJornada(creada.body.jornada.id);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.jornada.estado).toBe('cerrada');
    expect(respuesta.body.jornada.cerradaPor).toBe('administrador@lavadero.com');
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

  it('RBAC: un usuario "pendiente" no puede cerrar la jornada (403)', async () => {
    const creada = await abrirJornada();

    const respuesta = await cerrarJornada(creada.body.jornada.id, TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });

  it('requiere JWT (401 sin Authorization)', async () => {
    const creada = await abrirJornada();

    const respuesta = await conApiKey(
      'patch',
      `/api/jornadas/${creada.body.jornada.id}/estado`,
    ).send({ estado: 'cerrada' });
    expect(respuesta.status).toBe(401);
  });

  it('estado "abierta": superadmin reabre la jornada cerrada (200) y registra la reapertura', async () => {
    const creada = await abrirJornada();
    await cerrarJornada(creada.body.jornada.id);

    const respuesta = await reabrirJornada(creada.body.jornada.id);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.jornada.estado).toBe('abierta');
    expect(respuesta.body.jornada.reaperturas).toHaveLength(1);
  });

  it('RBAC: administrador no puede reabrir una jornada (403), solo superadmin', async () => {
    const creada = await abrirJornada();
    await cerrarJornada(creada.body.jornada.id);

    const respuesta = await reabrirJornada(creada.body.jornada.id, TOKEN_ADMINISTRADOR);
    expect(respuesta.status).toBe(403);
  });

  it('RBAC: soporte no puede reabrir una jornada (403), solo superadmin', async () => {
    const creada = await abrirJornada();
    await cerrarJornada(creada.body.jornada.id);

    const respuesta = await reabrirJornada(creada.body.jornada.id, TOKEN_SOPORTE);
    expect(respuesta.status).toBe(403);
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

    const respuesta = await conToken(
      'patch',
      `/api/jornadas/${creada.body.jornada.id}/estado`,
    ).send({ estado: 'pausada' });
    expect(respuesta.status).toBe(400);
  });
});
