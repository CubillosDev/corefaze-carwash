const request = require('supertest');
const { crearApp } = require('../../src/app');
const { supabase } = require('../../src/db/supabaseCliente');
const { generarToken } = require('../../src/utils/jwt.util');
const { generarSello, crearGeneradorDeValorUnico } = require('../utils/valorUnico');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40), web: 'w'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

// RBAC (Bloque 6): todo el recurso exige API Key + JWT con rol autorizado.
// autenticarJWT ya no toma el rol del payload del token: vuelve a
// consultar al usuario actual en Supabase (hallazgo de revisión del PR
// #7, SCRUM-152), así que estos ids deben ser los mismos (y en el mismo
// orden) que los 4 usuarios de supabase/seed.sql — uno por rol.
const ROLES_DE_PRUEBA = ['superadmin', 'administrador', 'soporte', 'pendiente'];
const idDeRolDePrueba = (rol) => ROLES_DE_PRUEBA.indexOf(rol) + 1;
const tokenDe = (rol) =>
  generarToken({ id: idDeRolDePrueba(rol), email: `${rol}@lavadero.com`, rol });
const TOKEN_SUPERADMIN = tokenDe('superadmin');
const TOKEN_ADMINISTRADOR = tokenDe('administrador');
const TOKEN_SOPORTE = tokenDe('soporte');
const TOKEN_PENDIENTE = tokenDe('pendiente');

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

const conToken = (metodo, ruta, token = TOKEN_ADMINISTRADOR) =>
  conApiKey(metodo, ruta).set('Authorization', `Bearer ${token}`);

// colaboradores.service.js ya escribe en el Supabase local (SCRUM-152), no
// en un array que el beforeEach pudiera vaciar: el documento es único
// (salto aleatorio por archivo + contador). El código solo tiene 900
// valores posibles (100-999, ver la migración de `colaboradores`) y un
// simple sorteo aleatorio choca con los que ya quedaron "activos" de
// corridas anteriores (nada los limpia sin un `db reset`), así que aquí
// se consulta qué códigos ya existen antes de sortear uno libre. Un
// `db reset` periódico sigue siendo necesario para que el rango no se
// agote del todo con el tiempo.
const selloDocumento = generarSello();
const documentoUnico = crearGeneradorDeValorUnico(
  selloDocumento,
  (sello, contador) => `${sello}${String(contador).padStart(3, '0')}`,
);

const codigosOcupados = new Set();
let siguienteIntentoCodigo = Math.floor(Math.random() * 900);

beforeAll(async () => {
  const { data, error } = await supabase.from('colaboradores').select('codigo');
  if (error) {
    throw error;
  }
  data.forEach((fila) => codigosOcupados.add(fila.codigo));
});

const codigoUnico = () => {
  for (let intento = 0; intento < 900; intento += 1) {
    const candidato = 100 + ((siguienteIntentoCodigo + intento) % 900);
    if (!codigosOcupados.has(candidato)) {
      codigosOcupados.add(candidato);
      siguienteIntentoCodigo += intento + 1;
      return candidato;
    }
  }
  throw new Error(
    'No quedan códigos de colaborador libres entre 100 y 999 (hace falta un db reset)',
  );
};

const colaboradorValido = (overrides = {}) => ({
  codigo: codigoUnico(),
  nombre: 'Juan Pérez',
  documento: documentoUnico(),
  telefono: '3001234567',
  porcentajeComision: 0.15,
  tipoVinculacion: 'fijo',
  ...overrides,
});

const registrarColaborador = async (datos = colaboradorValido()) => {
  const respuesta = await conToken('post', '/api/colaboradores').send(datos);
  return respuesta.body.colaborador;
};

describe('POST /api/colaboradores', () => {
  it('caso válido: registra un colaborador (201)', async () => {
    const datos = colaboradorValido();
    const respuesta = await conToken('post', '/api/colaboradores').send(datos);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.colaborador).toMatchObject({
      codigo: datos.codigo,
      nombre: 'Juan Pérez',
    });
  });

  it('duplicado: un código repetido responde 409', async () => {
    const datos = colaboradorValido();
    await registrarColaborador(datos);

    const respuesta = await conToken('post', '/api/colaboradores').send({
      ...colaboradorValido(),
      codigo: datos.codigo,
    });

    expect(respuesta.status).toBe(409);
  });

  it('duplicado: un documento repetido responde 409', async () => {
    const datos = colaboradorValido();
    await registrarColaborador(datos);

    const respuesta = await conToken('post', '/api/colaboradores').send({
      ...colaboradorValido(),
      documento: datos.documento,
    });

    expect(respuesta.status).toBe(409);
  });

  it('campo obligatorio faltante: 400', async () => {
    const sinNombre = colaboradorValido();
    delete sinNombre.nombre;

    const respuesta = await conToken('post', '/api/colaboradores').send(sinNombre);

    expect(respuesta.status).toBe(400);
  });

  it('código fuera de rango: 400', async () => {
    const respuesta = await conToken('post', '/api/colaboradores').send({
      ...colaboradorValido(),
      codigo: 99,
    });

    expect(respuesta.status).toBe(400);
  });

  it('mass assignment: el cliente no puede fijar id al crear', async () => {
    const respuesta = await conToken('post', '/api/colaboradores').send({
      ...colaboradorValido(),
      id: 9999,
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.colaborador.id).not.toBe(9999);
  });

  it('mass assignment: el cliente no puede fijar el estado al crear', async () => {
    const respuesta = await conToken('post', '/api/colaboradores').send({
      ...colaboradorValido(),
      estado: 'inactivo',
    });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.colaborador.estado).toBe('activo');
  });

  it('requiere API Key', async () => {
    const respuesta = await request(app)
      .post('/api/colaboradores')
      .set('Authorization', `Bearer ${TOKEN_ADMINISTRADOR}`)
      .send(colaboradorValido());
    expect(respuesta.status).toBe(401);
  });

  it('requiere JWT (401 sin Authorization, aunque la API Key sea válida)', async () => {
    const respuesta = await conApiKey('post', '/api/colaboradores').send(colaboradorValido());
    expect(respuesta.status).toBe(401);
  });

  it('un superadmin también puede crear (200/201)', async () => {
    const respuesta = await conToken('post', '/api/colaboradores', TOKEN_SUPERADMIN).send(
      colaboradorValido(),
    );
    expect(respuesta.status).toBe(201);
  });

  it('RBAC: soporte no puede crear colaboradores (403)', async () => {
    const respuesta = await conToken('post', '/api/colaboradores', TOKEN_SOPORTE).send(
      colaboradorValido(),
    );
    expect(respuesta.status).toBe(403);
  });

  it('RBAC: un usuario "pendiente" no puede crear colaboradores (403)', async () => {
    const respuesta = await conToken('post', '/api/colaboradores', TOKEN_PENDIENTE).send(
      colaboradorValido(),
    );
    expect(respuesta.status).toBe(403);
  });
});

describe('GET /api/colaboradores', () => {
  it('superadmin, administrador y soporte pueden listar (200)', async () => {
    await registrarColaborador();

    for (const token of [TOKEN_SUPERADMIN, TOKEN_ADMINISTRADOR, TOKEN_SOPORTE]) {
      const respuesta = await conToken('get', '/api/colaboradores', token);
      expect(respuesta.status).toBe(200);
    }
  });

  it('RBAC: un usuario "pendiente" no puede listar (403)', async () => {
    const respuesta = await conToken('get', '/api/colaboradores', TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });

  it('requiere JWT (401 sin Authorization)', async () => {
    const respuesta = await conApiKey('get', '/api/colaboradores');
    expect(respuesta.status).toBe(401);
  });
});

describe('GET /api/colaboradores/:id', () => {
  it('caso válido: devuelve el colaborador (200)', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conToken('get', `/api/colaboradores/${creado.id}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.colaborador).toMatchObject({ id: creado.id, codigo: creado.codigo });
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('get', '/api/colaboradores/999999999');
    expect(respuesta.status).toBe(404);
  });

  it('id inválido: 400', async () => {
    const respuesta = await conToken('get', '/api/colaboradores/abc');
    expect(respuesta.status).toBe(400);
  });

  it('soporte puede consultar un colaborador puntual (200)', async () => {
    const creado = await registrarColaborador();
    const respuesta = await conToken('get', `/api/colaboradores/${creado.id}`, TOKEN_SOPORTE);
    expect(respuesta.status).toBe(200);
  });

  it('RBAC: un usuario "pendiente" no puede consultar (403)', async () => {
    const creado = await registrarColaborador();
    const respuesta = await conToken('get', `/api/colaboradores/${creado.id}`, TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });
});

describe('PUT /api/colaboradores/:id', () => {
  it('actualiza el teléfono (200)', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conToken('put', `/api/colaboradores/${creado.id}`).send({
      telefono: '3009999999',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.colaborador.telefono).toBe('3009999999');
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('put', '/api/colaboradores/999999999').send({
      telefono: '3009999999',
    });

    expect(respuesta.status).toBe(404);
  });

  it('RBAC: soporte no puede actualizar (403)', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conToken('put', `/api/colaboradores/${creado.id}`, TOKEN_SOPORTE).send({
      telefono: '3009999999',
    });

    expect(respuesta.status).toBe(403);
  });
});

describe('PATCH /api/colaboradores/:id/estado', () => {
  it('cambia el estado a inactivo (200) y el GET posterior lo confirma', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conToken('patch', `/api/colaboradores/${creado.id}/estado`).send({
      estado: 'inactivo',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.colaborador.estado).toBe('inactivo');

    const consulta = await conToken('get', `/api/colaboradores/${creado.id}`);
    expect(consulta.body.colaborador.estado).toBe('inactivo');
  });

  it('estado inválido en el body: 400', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conToken('patch', `/api/colaboradores/${creado.id}/estado`).send({
      estado: 'suspendido',
    });

    expect(respuesta.status).toBe(400);
  });

  it('RBAC: soporte no puede cambiar el estado (403)', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conToken(
      'patch',
      `/api/colaboradores/${creado.id}/estado`,
      TOKEN_SOPORTE,
    ).send({ estado: 'inactivo' });

    expect(respuesta.status).toBe(403);
  });
});

describe('DELETE /api/colaboradores/:id', () => {
  it('sin relaciones: elimina correctamente (200)', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conToken('delete', `/api/colaboradores/${creado.id}`);

    expect(respuesta.status).toBe(200);
  });

  it('id inexistente: 404', async () => {
    const respuesta = await conToken('delete', '/api/colaboradores/999999999');
    expect(respuesta.status).toBe(404);
  });

  it('RBAC: soporte no puede eliminar (403)', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conToken('delete', `/api/colaboradores/${creado.id}`, TOKEN_SOPORTE);

    expect(respuesta.status).toBe(403);
  });

  it('RBAC: un usuario "pendiente" no puede eliminar (403)', async () => {
    const creado = await registrarColaborador();

    const respuesta = await conToken('delete', `/api/colaboradores/${creado.id}`, TOKEN_PENDIENTE);

    expect(respuesta.status).toBe(403);
  });
});
