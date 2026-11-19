const request = require('supertest');
const { crearApp } = require('../../src/app');
const { supabase } = require('../../src/db/supabaseCliente');
const { generarToken } = require('../../src/utils/jwt.util');

const LLAVE = 'k'.repeat(40);

const app = crearApp({
  apiKeys: { postman: LLAVE, admin: 'a'.repeat(40), movil: 'm'.repeat(40), web: 'w'.repeat(40) },
  origenPermitido: 'http://localhost:5173',
});

// RBAC (SCRUM-139): todo el recurso exige API Key + JWT con rol autorizado.
// autenticarJWT vuelve a consultar al usuario actual en Supabase
// (hallazgo de revisión del PR #7, SCRUM-152), así que estos ids deben
// ser los mismos (y en el mismo orden) que los 4 usuarios de
// supabase/seed.sql — uno por rol.
const ROLES_DE_PRUEBA = ['superadmin', 'administrador', 'soporte', 'pendiente'];
const idDeRolDePrueba = (rol) => ROLES_DE_PRUEBA.indexOf(rol) + 1;
const tokenDe = (rol) =>
  generarToken({ id: idDeRolDePrueba(rol), email: `${rol}@lavadero.com`, rol });
const TOKEN_SUPERADMIN = tokenDe('superadmin');
const TOKEN_ADMINISTRADOR = tokenDe('administrador');
const TOKEN_SOPORTE = tokenDe('soporte');
const TOKEN_PENDIENTE = tokenDe('pendiente');

const conApiKey = (metodo, ruta) => request(app)[metodo](ruta).set('X-API-Key', LLAVE);

const conToken = (metodo, ruta, token = TOKEN_SUPERADMIN) =>
  conApiKey(metodo, ruta).set('Authorization', `Bearer ${token}`);

const COLUMNAS = [
  'id',
  'nombre_negocio',
  'nit',
  'direccion',
  'telefono',
  'porcentaje_comision',
  'comision_vigente_desde',
  'descontar_comision_diaria',
  'costo_arriendo',
  'costo_luz',
  'costo_agua',
  'costo_nomina_fija',
  'costo_depreciacion',
  'costo_insumos',
  'costo_variable_lavado',
  'precio_promedio_referencia',
  'tope_prestamo_colaborador',
  'dias_operacion_mes',
  'actualizado_por',
].join(', ');

// parametros_negocio es una fila única (id = 1): no se puede "limpiar"
// entre pruebas como los demás recursos. Se guarda su estado original
// antes de este archivo y se restaura al final.
let filaOriginal;

beforeAll(async () => {
  const { data, error } = await supabase
    .from('parametros_negocio')
    .select(COLUMNAS)
    .eq('id', 1)
    .single();

  if (error) {
    throw error;
  }
  filaOriginal = data;
});

/** Quita "id" (no es una columna editable) antes de usar la fila como payload de un update. */
const sinId = ({ id: _id, ...resto }) => resto;

afterAll(async () => {
  const { error } = await supabase
    .from('parametros_negocio')
    .update(sinId(filaOriginal))
    .eq('id', 1);
  if (error) {
    throw error;
  }
});

describe('GET /api/parametros', () => {
  it('caso válido: responde 200 con los parámetros de negocio (nunca 404)', async () => {
    const respuesta = await conToken('get', '/api/parametros');

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.parametros).toMatchObject({ id: 1 });
    expect(respuesta.body.parametros.nombreNegocio).toBeDefined();
  });

  it('nunca incluye creadoEn ni actualizadoEn', async () => {
    const respuesta = await conToken('get', '/api/parametros');

    expect(respuesta.body.parametros.creadoEn).toBeUndefined();
    expect(respuesta.body.parametros.actualizadoEn).toBeUndefined();
  });

  it('administrador también puede consultar (200)', async () => {
    const respuesta = await conToken('get', '/api/parametros', TOKEN_ADMINISTRADOR);
    expect(respuesta.status).toBe(200);
  });

  it('soporte también puede consultar (200)', async () => {
    const respuesta = await conToken('get', '/api/parametros', TOKEN_SOPORTE);
    expect(respuesta.status).toBe(200);
  });

  it('RBAC: un usuario "pendiente" no puede consultar (403)', async () => {
    const respuesta = await conToken('get', '/api/parametros', TOKEN_PENDIENTE);
    expect(respuesta.status).toBe(403);
  });

  it('requiere API Key', async () => {
    const respuesta = await request(app).get('/api/parametros');
    expect(respuesta.status).toBe(401);
  });

  it('requiere JWT (401 sin Authorization, aunque la API Key sea válida)', async () => {
    const respuesta = await conApiKey('get', '/api/parametros');
    expect(respuesta.status).toBe(401);
  });
});

describe('PATCH /api/parametros', () => {
  it('caso válido: superadmin actualiza nombreNegocio (200), el resto conserva su valor', async () => {
    const antes = await conToken('get', '/api/parametros');

    const respuesta = await conToken('patch', '/api/parametros').send({
      nombreNegocio: 'Car Wash de Prueba',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.parametros.nombreNegocio).toBe('Car Wash de Prueba');
    expect(respuesta.body.parametros.porcentajeComision).toBe(
      antes.body.parametros.porcentajeComision,
    );
  });

  it('guarda quién hizo el cambio en actualizadoPor (el id del usuario autenticado)', async () => {
    const respuesta = await conToken('patch', '/api/parametros', TOKEN_SUPERADMIN).send({
      nombreNegocio: 'Otro nombre',
    });

    expect(respuesta.body.parametros.actualizadoPor).toBe(idDeRolDePrueba('superadmin'));
  });

  it('actualiza varios campos a la vez (costos y porcentajeComision)', async () => {
    const respuesta = await conToken('patch', '/api/parametros').send({
      porcentajeComision: 0.4,
      costoArriendo: 1800000,
      costoLuz: 280000,
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.parametros).toMatchObject({
      porcentajeComision: 0.4,
      costoArriendo: 1800000,
      costoLuz: 280000,
    });
  });

  it('ignora "id" y "actualizadoPor" enviados por el cliente (mass assignment)', async () => {
    const respuesta = await conToken('patch', '/api/parametros').send({
      id: 999,
      actualizadoPor: 999,
      nombreNegocio: 'Nombre válido',
    });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.parametros.id).toBe(1);
    expect(respuesta.body.parametros.actualizadoPor).toBe(idDeRolDePrueba('superadmin'));
  });

  it('caso inválido: diasOperacionMes fuera de rango (400)', async () => {
    const respuesta = await conToken('patch', '/api/parametros').send({ diasOperacionMes: 40 });
    expect(respuesta.status).toBe(400);
  });

  it('caso inválido: porcentajeComision fuera de rango (400)', async () => {
    const respuesta = await conToken('patch', '/api/parametros').send({ porcentajeComision: 1.5 });
    expect(respuesta.status).toBe(400);
  });

  it('caso inválido: un costo negativo (400)', async () => {
    const respuesta = await conToken('patch', '/api/parametros').send({ costoArriendo: -100 });
    expect(respuesta.status).toBe(400);
  });

  it('RBAC: administrador no puede actualizar (403)', async () => {
    const respuesta = await conToken('patch', '/api/parametros', TOKEN_ADMINISTRADOR).send({
      nombreNegocio: 'Intento no autorizado',
    });
    expect(respuesta.status).toBe(403);
  });

  it('RBAC: soporte no puede actualizar (403)', async () => {
    const respuesta = await conToken('patch', '/api/parametros', TOKEN_SOPORTE).send({
      nombreNegocio: 'Intento no autorizado',
    });
    expect(respuesta.status).toBe(403);
  });

  it('RBAC: un usuario "pendiente" no puede actualizar (403)', async () => {
    const respuesta = await conToken('patch', '/api/parametros', TOKEN_PENDIENTE).send({
      nombreNegocio: 'Intento no autorizado',
    });
    expect(respuesta.status).toBe(403);
  });

  it('sin JWT responde 401', async () => {
    const respuesta = await conApiKey('patch', '/api/parametros').send({
      nombreNegocio: 'Intento no autorizado',
    });
    expect(respuesta.status).toBe(401);
  });
});
