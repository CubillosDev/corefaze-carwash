const request = require('supertest');
const { crearApp } = require('../../src/app');
const colaboradores = require('../../src/data/colaboradores');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40), web: 'w'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

beforeEach(() => {
  colaboradores.length = 0;
});

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

const colaboradorValido = {
  codigo: 401,
  nombre: 'Juan Pérez',
  documento: '1020304050',
  telefono: '3001234567',
  porcentajeComision: 0.15,
  tipoVinculacion: 'fijo',
};

const registrarColaborador = async (datos = colaboradorValido) => {
  const respuesta = await conApiKey('post', '/api/colaboradores').send(datos);
  return respuesta.body.colaborador;
};

describe('POST /api/colaboradores', () => {
  it('caso válido: registra un colaborador (201)', async () => {
    const respuesta = await conApiKey('post', '/api/colaboradores').send(colaboradorValido);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.colaborador).toMatchObject({ codigo: 401, nombre: 'Juan Pérez' });
  });

  it('duplicado: un código repetido responde 409', async () => {
    await registrarColaborador();

    const respuesta = await conApiKey('post', '/api/colaboradores').send({
      ...colaboradorValido,
      documento: '9999999999',
    });

    expect(respuesta.status).toBe(409);
  });

  it('duplicado: un documento repetido responde 409', async () => {
    await registrarColaborador();

    const respuesta = await conApiKey('post', '/api/colaboradores').send({
      ...colaboradorValido,
      codigo: 402,
    });

    expect(respuesta.status).toBe(409);
  });

  it('campo obligatorio faltante: 400', async () => {
    const sinNombre = { ...colaboradorValido };
    delete sinNombre.nombre;

    const respuesta = await conApiKey('post', '/api/colaboradores').send(sinNombre);

    expect(respuesta.status).toBe(400);
  });

  it('código fuera de rango: 400', async () => {
    const respuesta = await conApiKey('post', '/api/colaboradores').send({
      ...colaboradorValido,
      codigo: 99,
    });

    expect(respuesta.status).toBe(400);
  });

  it('mass assignment: el cliente no puede fijar id al crear', async () => {
    const respuesta = await conApiKey('post', '/api/colaboradores').send({
      ...colaboradorValido,
      id: 9999,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.colaborador.id).not.toBe(9999);
  });

  it('mass assignment: el cliente no puede fijar el estado al crear', async () => {
    const respuesta = await conApiKey('post', '/api/colaboradores').send({
      ...colaboradorValido,
      estado: 'inactivo',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.colaborador.estado).toBe('activo');
  });

  it('requiere API Key', async () => {
    const respuesta = await request(app).post('/api/colaboradores').send(colaboradorValido);
    expect(respuesta.status).toBe(401);
  });
});

describe('GET /api/colaboradores/:id', () => {
  it('caso válido: devuelve el colaborador (200)', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conApiKey('get', `/api/colaboradores/${creado.id}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.colaborador).toMatchObject({ id: creado.id, codigo: 401 });
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conApiKey('get', '/api/colaboradores/9999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conApiKey('get', '/api/colaboradores/abc');
    expect(respuesta.status).toBe(400);
  });
});

describe('PUT /api/colaboradores/:id', () => {
  it('actualiza el teléfono (200)', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conApiKey('put', `/api/colaboradores/${creado.id}`).send({
      telefono: '3009999999',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.colaborador.telefono).toBe('3009999999');
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conApiKey('put', '/api/colaboradores/9999').send({
      telefono: '3009999999',
    });

    expect(respuesta.status).toBe(404);
  });
});

describe('PATCH /api/colaboradores/:id/estado', () => {
  it('cambia el estado a inactivo (200) y el GET posterior lo confirma', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conApiKey('patch', `/api/colaboradores/${creado.id}/estado`).send({
      estado: 'inactivo',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.colaborador.estado).toBe('inactivo');

    const consulta = await conApiKey('get', `/api/colaboradores/${creado.id}`);
    expect(consulta.body.colaborador.estado).toBe('inactivo');
  });

  it('estado inválido en el body: 400', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conApiKey('patch', `/api/colaboradores/${creado.id}/estado`).send({
      estado: 'suspendido',
    });

    expect(respuesta.status).toBe(400);
  });
});

describe('DELETE /api/colaboradores/:id', () => {
  it('sin relaciones: elimina correctamente (200)', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conApiKey('delete', `/api/colaboradores/${creado.id}`);

    expect(respuesta.status).toBe(200);
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conApiKey('delete', '/api/colaboradores/9999');
    expect(respuesta.status).toBe(404);
  });
});
