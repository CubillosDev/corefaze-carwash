const request = require('supertest');
const { crearApp } = require('../../src/app');
const vehiculos = require('../../src/data/vehiculos');
const servicios = require('../../src/data/servicios');
const colaboradores = require('../../src/data/colaboradores');
const ordenesLavado = require('../../src/data/ordenesLavado');
const jornadas = require('../../src/data/jornadas');
const serviciosService = require('../../src/services/servicios.service');
const colaboradoresService = require('../../src/services/colaboradores.service');
const ordenesLavadoService = require('../../src/services/ordenesLavado.service');
const jornadasService = require('../../src/services/jornadas.service');
const usuarios = require('../../src/data/usuarios');
const { generarToken } = require('../../src/utils/jwt.util');

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
  vehiculos.length = 0;
  servicios.length = 0;
  colaboradores.length = 0;
  ordenesLavado.length = 0;
  jornadas.length = 0;
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

// clientes.service.js ya escribe en el Supabase local (SCRUM-152, Etapa
// A), no en un array que el beforeEach pudiera vaciar: el documento es
// único (sello de tiempo + contador) para no chocar ni dentro de esta
// corrida ni con filas de corridas anteriores sin un `db reset` de por medio.
const selloDocumentoCliente = Date.now().toString().slice(-9);
let contadorDocumentoCliente = 0;

const registrarCliente = async () => {
  contadorDocumentoCliente += 1;
  const respuesta = await conToken('post', '/api/clientes').send({
    nombre: 'Ana María Torres',
    documento: `${selloDocumentoCliente}${String(contadorDocumentoCliente).padStart(3, '0')}`,
    tipo: 'particular',
    telefono: '3001234567',
  });
  return respuesta.body.cliente;
};

describe('POST /api/vehiculos', () => {
  it('caso válido: registra un vehículo (201)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: 'abc123',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(201);
    // La placa se normaliza a mayúsculas
    expect(respuesta.body.vehiculo.placa).toBe('ABC123');
  });

  it('regla de negocio: placa de moto corresponde a tipo moto', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: 'ABC12D',
      tipoVehiculo: 'moto_hasta_150cc',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(201);
  });

  it('regla de negocio: rechaza placa de moto para un tipo automovil (400)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: 'ABC12D',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(400);
  });

  it('caso inválido: placa con formato incorrecto (400)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: '12-ABC',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(400);
  });

  it('cliente inexistente: 404', async () => {
    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipoVehiculo: 'automovil',
      clienteId: 9999,
    });

    expect(respuesta.status).toBe(404);
  });

  it('duplicado: una placa repetida responde 409', async () => {
    const cliente = await registrarCliente();
    await conToken('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(409);
  });

  it('mass assignment: id enviado por el cliente se ignora', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
      id: 9999,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.vehiculo.id).not.toBe(9999);
  });

  it('requiere API Key', async () => {
    const respuesta = await request(app)
      .post('/api/vehiculos')
      .set('Authorization', `Bearer ${TOKEN_ADMINISTRADOR}`)
      .send({});
    expect(respuesta.status).toBe(401);
  });

  it('requiere JWT (401 sin Authorization, aunque la API Key sea válida)', async () => {
    const respuesta = await conApiKey('post', '/api/vehiculos').send({});
    expect(respuesta.status).toBe(401);
  });

  it('un superadmin también puede crear (201)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos', TOKEN_SUPERADMIN).send({
      placa: 'ABC123',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(201);
  });

  it('RBAC: soporte no puede crear vehículos (403)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('post', '/api/vehiculos', TOKEN_SOPORTE).send({
      placa: 'ABC123',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    expect(respuesta.status).toBe(403);
  });

  it('RBAC: un usuario "pendiente" no puede crear vehículos (403)', async () => {
    const respuesta = await conToken('post', '/api/vehiculos', TOKEN_PENDIENTE).send({});
    expect(respuesta.status).toBe(403);
  });
});

describe('GET /api/vehiculos/:id', () => {
  it('id inexistente: 404', async () => {
    const respuesta = await conToken('get', '/api/vehiculos/9999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conToken('get', '/api/vehiculos/abc');
    expect(respuesta.status).toBe(400);
  });

  it('soporte puede consultar (200/404 según exista)', async () => {
    const respuesta = await conToken('get', '/api/vehiculos/9999', TOKEN_SOPORTE);
    expect(respuesta.status).toBe(404);
  });

  it('RBAC: un usuario "pendiente" no puede consultar (403)', async () => {
    const respuesta = await conToken('get', '/api/vehiculos/9999', TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });
});

describe('PUT /api/vehiculos/:id', () => {
  it('actualiza el color (200)', async () => {
    const cliente = await registrarCliente();
    const creado = await conToken('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conToken('put', `/api/vehiculos/${creado.body.vehiculo.id}`).send({
      color: 'rojo',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.vehiculo.color).toBe('rojo');
  });

  it('RBAC: soporte no puede actualizar (403)', async () => {
    const cliente = await registrarCliente();
    const creado = await conToken('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conToken(
      'put',
      `/api/vehiculos/${creado.body.vehiculo.id}`,
      TOKEN_SOPORTE,
    ).send({ color: 'rojo' });

    expect(respuesta.status).toBe(403);
  });
});

describe('DELETE /api/vehiculos/:id', () => {
  it('sin relaciones: elimina correctamente (200)', async () => {
    const cliente = await registrarCliente();
    const creado = await conToken('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conToken('delete', `/api/vehiculos/${creado.body.vehiculo.id}`);

    expect(respuesta.status).toBe(200);
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('delete', '/api/vehiculos/9999');
    expect(respuesta.status).toBe(404);
  });

  it('RBAC: soporte no puede eliminar (403)', async () => {
    const respuesta = await conToken('delete', '/api/vehiculos/9999', TOKEN_SOPORTE);
    expect(respuesta.status).toBe(403);
  });
});

describe('Integridad referencial: DELETE /api/clientes/:id con vehículos', () => {
  it('no se puede eliminar un cliente con vehículos asociados (409)', async () => {
    const cliente = await registrarCliente();
    await conToken('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });

    const respuesta = await conToken('delete', `/api/clientes/${cliente.id}`);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({
      mensaje: 'No se puede eliminar un cliente con vehículos asociados',
    });
  });

  it('sí se puede eliminar un cliente sin vehículos (200)', async () => {
    const cliente = await registrarCliente();

    const respuesta = await conToken('delete', `/api/clientes/${cliente.id}`);

    expect(respuesta.status).toBe(200);
  });
});

describe('Integridad referencial: DELETE /api/vehiculos/:id con órdenes de lavado', () => {
  it('no se puede eliminar un vehículo con órdenes de lavado asociadas (409)', async () => {
    const cliente = await registrarCliente();
    const vehiculoCreado = await conToken('post', '/api/vehiculos').send({
      placa: 'ABC123',
      tipoVehiculo: 'automovil',
      clienteId: cliente.id,
    });
    const vehiculo = vehiculoCreado.body.vehiculo;

    // La orden de prueba se crea directamente contra los services (en vez
    // de vía HTTP), que operan sobre los mismos arreglos en memoria que
    // usa la app; evita repetir aquí todo el setup de los otros recursos.
    jornadasService.abrirJornada();
    const servicio = serviciosService.crearServicio({
      numero: 1,
      nombre: 'Lavado básico',
      descripcion: 'Lavado exterior con shampoo',
      categoria: 'basico',
      tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
    });
    const colaborador = colaboradoresService.crearColaborador({
      codigo: 401,
      nombre: 'Juan Pérez',
      documento: '1020304050',
      telefono: '3001234567',
      porcentajeComision: 0.15,
      tipoVinculacion: 'fijo',
    });
    ordenesLavadoService.crearOrden({
      turno: 1,
      vehiculoId: vehiculo.id,
      servicioId: servicio.id,
      colaboradorId: colaborador.id,
      medioPago: 'efectivo',
    });

    const respuesta = await conToken('delete', `/api/vehiculos/${vehiculo.id}`);

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({
      mensaje: 'No se puede eliminar un vehículo con órdenes de lavado asociadas',
    });
  });
});
