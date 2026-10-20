const request = require('supertest');
const { crearApp } = require('../../src/app');
const servicios = require('../../src/data/servicios');
const { generarToken } = require('../../src/utils/jwt.util');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

beforeEach(() => {
  servicios.length = 0;
});

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

// RBAC (SCRUM-139): todo el recurso exige API Key + JWT con rol autorizado.
const tokenDe = (rol) => generarToken({ id: 1, email: `${rol}@lavadero.com`, rol });
const TOKEN_SUPERADMIN = tokenDe('superadmin');
const TOKEN_ADMINISTRADOR = tokenDe('administrador');
const TOKEN_SOPORTE = tokenDe('soporte');
const TOKEN_PENDIENTE = tokenDe('pendiente');

const conToken = (metodo, ruta, token = TOKEN_ADMINISTRADOR) =>
  conApiKey(metodo, ruta).set('Authorization', `Bearer ${token}`);

const servicioValido = {
  numero: 1,
  nombre: 'Lavado básico',
  descripcion: 'Lavado exterior con shampoo',
  categoria: 'basico',
  tarifas: [{ tipoVehiculo: 'automovil', valor: 15000 }],
};

const registrarServicio = async (datos = servicioValido) => {
  const respuesta = await conToken('post', '/api/servicios').send(datos);
  return respuesta.body.servicio;
};

describe('POST /api/servicios', () => {
  it('caso válido: registra un servicio con una tarifa (201)', async () => {
    const respuesta = await conToken('post', '/api/servicios').send(servicioValido);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.servicio).toMatchObject({ numero: 1, nombre: 'Lavado básico' });
  });

  it('caso válido: registra un servicio con tarifas para dos tipos de vehículo (201)', async () => {
    const respuesta = await conToken('post', '/api/servicios').send({
      ...servicioValido,
      tarifas: [
        { tipoVehiculo: 'automovil', valor: 15000 },
        { tipoVehiculo: 'camioneta', valor: 20000 },
      ],
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.servicio.tarifas).toHaveLength(2);
  });

  it('duplicado: un número repetido responde 409', async () => {
    await registrarServicio();

    const respuesta = await conToken('post', '/api/servicios').send({
      ...servicioValido,
      nombre: 'Otro lavado',
    });

    expect(respuesta.status).toBe(409);
  });

  it('campo obligatorio faltante: 400', async () => {
    const sinNombre = { ...servicioValido };
    delete sinNombre.nombre;

    const respuesta = await conToken('post', '/api/servicios').send(sinNombre);

    expect(respuesta.status).toBe(400);
  });

  it('tarifas vacío: 400', async () => {
    const respuesta = await conToken('post', '/api/servicios').send({
      ...servicioValido,
      tarifas: [],
    });

    expect(respuesta.status).toBe(400);
  });

  it('tarifas con tipoVehiculo duplicado: 400', async () => {
    const respuesta = await conToken('post', '/api/servicios').send({
      ...servicioValido,
      tarifas: [
        { tipoVehiculo: 'automovil', valor: 15000 },
        { tipoVehiculo: 'automovil', valor: 18000 },
      ],
    });

    expect(respuesta.status).toBe(400);
  });

  it('mass assignment: el cliente no puede fijar id al crear', async () => {
    const respuesta = await conToken('post', '/api/servicios').send({
      ...servicioValido,
      id: 9999,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.servicio.id).not.toBe(9999);
  });

  it('mass assignment: el cliente no puede fijar activo al crear (siempre nace true)', async () => {
    const respuesta = await conToken('post', '/api/servicios').send({
      ...servicioValido,
      activo: false,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.servicio.activo).toBe(true);
  });

  it('requiere API Key', async () => {
    const respuesta = await request(app)
      .post('/api/servicios')
      .set('Authorization', `Bearer ${TOKEN_ADMINISTRADOR}`)
      .send(servicioValido);
    expect(respuesta.status).toBe(401);
  });

  it('requiere JWT (401 sin Authorization, aunque la API Key sea válida)', async () => {
    const respuesta = await conApiKey('post', '/api/servicios').send(servicioValido);
    expect(respuesta.status).toBe(401);
  });

  it('un superadmin también puede crear (201)', async () => {
    const respuesta = await conToken('post', '/api/servicios', TOKEN_SUPERADMIN).send(
      servicioValido,
    );
    expect(respuesta.status).toBe(201);
  });

  it('RBAC: soporte no puede crear servicios (403)', async () => {
    const respuesta = await conToken('post', '/api/servicios', TOKEN_SOPORTE).send(servicioValido);
    expect(respuesta.status).toBe(403);
  });

  it('RBAC: un usuario "pendiente" no puede crear servicios (403)', async () => {
    const respuesta = await conToken('post', '/api/servicios', TOKEN_PENDIENTE).send(
      servicioValido,
    );
    expect(respuesta.status).toBe(403);
  });
});

describe('GET /api/servicios/:id', () => {
  it('caso válido: devuelve el servicio (200)', async () => {
    const creado = await registrarServicio();

    const respuesta = await conToken('get', `/api/servicios/${creado.id}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.servicio).toMatchObject({ id: creado.id, numero: 1 });
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('get', '/api/servicios/9999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conToken('get', '/api/servicios/abc');
    expect(respuesta.status).toBe(400);
  });

  it('soporte puede consultar el catálogo (200)', async () => {
    const creado = await registrarServicio();
    const respuesta = await conToken('get', `/api/servicios/${creado.id}`, TOKEN_SOPORTE);
    expect(respuesta.status).toBe(200);
  });

  it('RBAC: un usuario "pendiente" no puede consultar (403)', async () => {
    const respuesta = await conToken('get', '/api/servicios/9999', TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });
});

describe('PUT /api/servicios/:id', () => {
  it('actualiza el nombre (200)', async () => {
    const creado = await registrarServicio();

    const respuesta = await conToken('put', `/api/servicios/${creado.id}`).send({
      nombre: 'Lavado premium',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.servicio.nombre).toBe('Lavado premium');
  });

  it('reemplaza el arreglo de tarifas completo (200)', async () => {
    const creado = await registrarServicio();
    const nuevasTarifas = [
      { tipoVehiculo: 'moto_hasta_150cc', valor: 8000 },
      { tipoVehiculo: 'moto_desde_150cc', valor: 10000 },
    ];

    const respuesta = await conToken('put', `/api/servicios/${creado.id}`).send({
      tarifas: nuevasTarifas,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.servicio.tarifas).toEqual(nuevasTarifas);
  });

  it('cambia activo a false (200)', async () => {
    const creado = await registrarServicio();

    const respuesta = await conToken('put', `/api/servicios/${creado.id}`).send({
      activo: false,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.servicio.activo).toBe(false);
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('put', '/api/servicios/9999').send({
      nombre: 'Lavado premium',
    });

    expect(respuesta.status).toBe(404);
  });

  it('RBAC: soporte no puede actualizar (403)', async () => {
    const creado = await registrarServicio();

    const respuesta = await conToken('put', `/api/servicios/${creado.id}`, TOKEN_SOPORTE).send({
      nombre: 'Lavado premium',
    });

    expect(respuesta.status).toBe(403);
  });
});

describe('DELETE /api/servicios/:id', () => {
  it('sin relaciones: elimina correctamente (200)', async () => {
    const creado = await registrarServicio();

    const respuesta = await conToken('delete', `/api/servicios/${creado.id}`);

    expect(respuesta.status).toBe(200);
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('delete', '/api/servicios/9999');
    expect(respuesta.status).toBe(404);
  });

  it('RBAC: soporte no puede eliminar (403)', async () => {
    const creado = await registrarServicio();

    const respuesta = await conToken('delete', `/api/servicios/${creado.id}`, TOKEN_SOPORTE);

    expect(respuesta.status).toBe(403);
  });
});
