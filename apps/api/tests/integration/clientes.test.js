const request = require('supertest');
const { crearApp } = require('../../src/app');
const clientes = require('../../src/data/clientes');
const usuarios = require('../../src/data/usuarios');
const { generarToken } = require('../../src/utils/jwt.util');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40) },
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
  clientes.length = 0;
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

const clienteParticular = {
  nombre: 'Ana María Torres',
  documento: '1010101010',
  tipo: 'particular',
  telefono: '3001234567',
};

const clienteEmpresa = {
  nombre: 'EBSA S.A.',
  documento: '900123456',
  tipo: 'empresa',
  telefono: '3007654321',
  creditoHabilitado: true,
};

describe('POST /api/clientes', () => {
  it('caso válido: registra un cliente particular (201)', async () => {
    const respuesta = await conToken('post', '/api/clientes').send(clienteParticular);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.cliente).toMatchObject({
      nombre: clienteParticular.nombre,
      documento: clienteParticular.documento,
      estado: 'activo',
      creditoHabilitado: false,
    });
  });

  it('regla de negocio: una empresa puede tener creditoHabilitado true', async () => {
    const respuesta = await conToken('post', '/api/clientes').send(clienteEmpresa);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.cliente.creditoHabilitado).toBe(true);
  });

  it('regla de negocio: un particular nunca tiene creditoHabilitado, aunque lo pida', async () => {
    const respuesta = await conToken('post', '/api/clientes').send({
      ...clienteParticular,
      creditoHabilitado: true,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.cliente.creditoHabilitado).toBe(false);
  });

  it('caso inválido: teléfono con formato incorrecto (400)', async () => {
    const respuesta = await conToken('post', '/api/clientes').send({
      ...clienteParticular,
      telefono: '123',
    });

    expect(respuesta.status).toBe(400);
  });

  it('campo obligatorio faltante: sin documento (400)', async () => {
    const sinDocumento = { ...clienteParticular };
    delete sinDocumento.documento;

    const respuesta = await conToken('post', '/api/clientes').send(sinDocumento);

    expect(respuesta.status).toBe(400);
  });

  it('tipo de dato incorrecto: telefono como número en vez de texto (400)', async () => {
    const respuesta = await conToken('post', '/api/clientes').send({
      ...clienteParticular,
      telefono: 3001234567,
    });

    expect(respuesta.status).toBe(400);
  });

  it('valor fuera de rango: nombre de un solo carácter (400)', async () => {
    const respuesta = await conToken('post', '/api/clientes').send({
      ...clienteParticular,
      nombre: 'A',
    });

    expect(respuesta.status).toBe(400);
  });

  it('duplicado: un documento repetido responde 409', async () => {
    await conToken('post', '/api/clientes').send(clienteParticular);
    const respuesta = await conToken('post', '/api/clientes').send({
      ...clienteEmpresa,
      documento: clienteParticular.documento,
    });

    expect(respuesta.status).toBe(409);
    expect(respuesta.body).toEqual({ mensaje: 'Ya existe un cliente con ese documento' });
  });

  it('mass assignment: id y estado enviados por el cliente se ignoran', async () => {
    const respuesta = await conToken('post', '/api/clientes').send({
      ...clienteParticular,
      id: 9999,
      estado: 'inactivo',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.cliente.id).not.toBe(9999);
    expect(respuesta.body.cliente.estado).toBe('activo');
  });

  it('requiere API Key, igual que el resto de /api', async () => {
    const respuesta = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${TOKEN_ADMINISTRADOR}`)
      .send(clienteParticular);
    expect(respuesta.status).toBe(401);
  });

  it('requiere JWT (401 sin Authorization, aunque la API Key sea válida)', async () => {
    const respuesta = await conApiKey('post', '/api/clientes').send(clienteParticular);
    expect(respuesta.status).toBe(401);
  });

  it('un superadmin también puede crear (201)', async () => {
    const respuesta = await conToken('post', '/api/clientes', TOKEN_SUPERADMIN).send(
      clienteParticular,
    );
    expect(respuesta.status).toBe(201);
  });

  it('RBAC: soporte no puede crear clientes (403)', async () => {
    const respuesta = await conToken('post', '/api/clientes', TOKEN_SOPORTE).send(
      clienteParticular,
    );
    expect(respuesta.status).toBe(403);
  });

  it('RBAC: un usuario "pendiente" no puede crear clientes (403)', async () => {
    const respuesta = await conToken('post', '/api/clientes', TOKEN_PENDIENTE).send(
      clienteParticular,
    );
    expect(respuesta.status).toBe(403);
  });
});

describe('GET /api/clientes', () => {
  it('lista los clientes creados', async () => {
    await conToken('post', '/api/clientes').send(clienteParticular);
    await conToken('post', '/api/clientes').send(clienteEmpresa);

    const respuesta = await conToken('get', '/api/clientes');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.clientes).toHaveLength(2);
  });

  it('soporte puede listar clientes (200)', async () => {
    const respuesta = await conToken('get', '/api/clientes', TOKEN_SOPORTE);
    expect(respuesta.status).toBe(200);
  });

  it('RBAC: un usuario "pendiente" no puede listar (403)', async () => {
    const respuesta = await conToken('get', '/api/clientes', TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });

  it('requiere JWT (401 sin Authorization)', async () => {
    const respuesta = await conApiKey('get', '/api/clientes');
    expect(respuesta.status).toBe(401);
  });
});

describe('GET /api/clientes/:id', () => {
  it('caso válido: obtiene el cliente creado (200)', async () => {
    const creado = await conToken('post', '/api/clientes').send(clienteParticular);

    const respuesta = await conToken('get', `/api/clientes/${creado.body.cliente.id}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.cliente.documento).toBe(clienteParticular.documento);
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('get', '/api/clientes/9999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conToken('get', '/api/clientes/abc');
    expect(respuesta.status).toBe(400);
  });
});

describe('PUT /api/clientes/:id', () => {
  it('caso válido: actualiza el teléfono (200)', async () => {
    const creado = await conToken('post', '/api/clientes').send(clienteParticular);

    const respuesta = await conToken('put', `/api/clientes/${creado.body.cliente.id}`).send({
      telefono: '3009999999',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.cliente.telefono).toBe('3009999999');
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('put', '/api/clientes/9999').send({
      telefono: '3009999999',
    });
    expect(respuesta.status).toBe(404);
  });

  it('regla de negocio: activar creditoHabilitado a la vez que se cambia a empresa', async () => {
    const creado = await conToken('post', '/api/clientes').send(clienteParticular);

    const respuesta = await conToken('put', `/api/clientes/${creado.body.cliente.id}`).send({
      tipo: 'empresa',
      creditoHabilitado: true,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.cliente.creditoHabilitado).toBe(true);
  });

  it('RBAC: soporte no puede actualizar (403)', async () => {
    const creado = await conToken('post', '/api/clientes').send(clienteParticular);

    const respuesta = await conToken(
      'put',
      `/api/clientes/${creado.body.cliente.id}`,
      TOKEN_SOPORTE,
    ).send({ telefono: '3009999999' });

    expect(respuesta.status).toBe(403);
  });
});

describe('DELETE /api/clientes/:id', () => {
  it('sin relaciones: elimina correctamente (200)', async () => {
    const creado = await conToken('post', '/api/clientes').send(clienteParticular);

    const respuesta = await conToken('delete', `/api/clientes/${creado.body.cliente.id}`);

    expect(respuesta.status).toBe(200);
    expect(clientes).toHaveLength(0);
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('delete', '/api/clientes/9999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conToken('delete', '/api/clientes/abc');
    expect(respuesta.status).toBe(400);
  });

  it('RBAC: soporte no puede eliminar (403)', async () => {
    const creado = await conToken('post', '/api/clientes').send(clienteParticular);

    const respuesta = await conToken(
      'delete',
      `/api/clientes/${creado.body.cliente.id}`,
      TOKEN_SOPORTE,
    );

    expect(respuesta.status).toBe(403);
  });
});
